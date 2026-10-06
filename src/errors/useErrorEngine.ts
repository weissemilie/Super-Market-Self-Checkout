import { useCallback, useEffect, useRef } from 'react'
import type { CheckoutAction, CheckoutState } from '../checkout/types'
import { errors as allErrors } from '../data'
import type { ErrorConfig } from './errorEngine'
import { isWithinGracePeriod, nextDelayMs, pickError } from './errorEngine'

export function useErrorEngine(
  state: CheckoutState,
  dispatch: (action: CheckoutAction) => void,
  config: ErrorConfig,
): void {
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const lastErrorCodeRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Vælger en fejl via pickError og dispatcher den, hvis der var en at
  // vælge.
  const pickAndDispatch = useCallback(() => {
    const currentConfig = configRef.current
    const picked = pickError(
      allErrors,
      currentConfig.enabledErrors,
      lastErrorCodeRef.current,
      Math.random,
    )
    if (picked) {
      lastErrorCodeRef.current = picked.code
      dispatch({ type: 'TRIGGER_ERROR', errorCode: picked.code, now: Date.now() })
    }
    return picked
  }, [dispatch])

  // Forsøger at udløse en tilfældig fejl nu. Returnerer om det faktisk skete.
  const triggerError = useCallback((): boolean => {
    const currentState = stateRef.current
    const currentConfig = configRef.current

    if (!currentConfig.enabled) {
      return false
    }
    // Mens instruktørpanelet er åbent, holder fejlgeneratoren pause.
    if (currentState.adminOpen) {
      return false
    }
    if (currentState.mode !== 'SHOPPING' && currentState.mode !== 'PAYING') {
      return false
    }
    if (
      isWithinGracePeriod(
        currentState.lastErrorSolvedAt,
        Date.now(),
        currentConfig.gracePeriodSeconds,
      )
    ) {
      return false
    }

    return pickAndDispatch() !== null
  }, [pickAndDispatch])

  // Starter en ny ventetid. Kaldes forfra efter hver fejl (udløst af
  // timeren selv eller af en scanning), så ventetiden altid er tilfældig.
  // Den rekursive timeout går via en ref i stedet for at kalde scheduleTimer
  // direkte, så useCallback ikke refererer til sig selv.
  const scheduleTimerRef = useRef<() => void>(() => {})

  const scheduleTimer = useCallback(() => {
    clearTimer()
    const delay = nextDelayMs(configRef.current, Math.random)
    timeoutRef.current = setTimeout(() => {
      triggerError()
      scheduleTimerRef.current()
    }, delay)
  }, [clearTimer, triggerError])

  useEffect(() => {
    scheduleTimerRef.current = scheduleTimer
  }, [scheduleTimer])

  // Timeren kører hele tiden undervejs i et køb (SHOPPING, PAYING, ERROR) og
  // stoppes i IDLE, DONE og mens instruktørpanelet er åbent. Den starter
  // forfra med en ny tilfældig ventetid, når panelet lukkes igen.
  useEffect(() => {
    const shouldRun =
      state.mode !== 'IDLE' && state.mode !== 'DONE' && !state.adminOpen
    if (shouldRun) {
      if (timeoutRef.current === null) {
        scheduleTimer()
      }
    } else {
      clearTimer()
    }
  }, [state.mode, state.adminOpen, scheduleTimer, clearTimer])

  useEffect(() => clearTimer, [clearTimer])

  // Efter hver vellykket varescanning rulles der en selvstændig chance for
  // en fejl, uafhængigt af timeren.
  const previousItemsScannedRef = useRef(state.stats.itemsScanned)
  useEffect(() => {
    const previous = previousItemsScannedRef.current
    previousItemsScannedRef.current = state.stats.itemsScanned

    if (state.stats.itemsScanned <= previous) {
      return
    }

    if (Math.random() < configRef.current.chancePerScan) {
      const triggered = triggerError()
      if (triggered) {
        scheduleTimer()
      }
    }
  }, [state.stats.itemsScanned, triggerError, scheduleTimer])
}
