import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useBarcodeScanner } from '../scanner/useBarcodeScanner'
import { beep, errorAlarm, success } from '../sound'
import { checkoutReducer, createInitialState } from './checkoutReducer'
import { loadSettings, saveSettings } from './settingsStorage'
import type { CheckoutAction, CheckoutState } from './types'

const TICK_INTERVAL_MS = 1000
const MAX_RECENT_SCANS = 10

export interface RecentScan {
  id: number
  code: string
  time: number
}

export interface UseCheckoutResult {
  state: CheckoutState
  dispatch: (action: CheckoutAction) => void
  handleScan: (code: string) => void
  recentScans: RecentScan[]
}

export function useCheckout(): UseCheckoutResult {
  const [state, dispatch] = useReducer(
    checkoutReducer,
    undefined,
    () => createInitialState(loadSettings()),
  )
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const nextScanId = useRef(0)

  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])

  // Fælles indgang for både rigtige scanninger (useBarcodeScanner nedenfor)
  // og simulerede scanninger fra ScanDebug's inputfelt.
  const handleScan = useCallback((code: string) => {
    beep()

    const time = Date.now()
    setRecentScans((previous) =>
      [{ id: nextScanId.current++, code, time }, ...previous].slice(
        0,
        MAX_RECENT_SCANS,
      ),
    )
    dispatch({
      type: 'SCAN',
      code,
      now: time,
      rolls: { price: Math.random(), error: Math.random() },
    })
  }, [])

  useBarcodeScanner(handleScan)

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() })
    }, TICK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const previousModeRef = useRef(state.mode)
  useEffect(() => {
    const previousMode = previousModeRef.current
    if (previousMode !== 'ERROR' && state.mode === 'ERROR') {
      errorAlarm()
    } else if (previousMode === 'ERROR' && state.mode !== 'ERROR') {
      success()
    }
    previousModeRef.current = state.mode
  }, [state.mode])

  return { state, dispatch, handleScan, recentScans }
}
