import { useCallback, useEffect, useRef } from 'react'
import type { CheckoutState } from '../checkout/types'
import type { LampState } from './LampController'
import { lampStateFor } from './lampStateFor'
import { useLamp } from './useLamp'

// Hvor ofte lampen genberegnes, mens checkout-state ikke ændrer sig. Det er
// det der gør, at lampen selv opdager når en straf udløber ved uret, uden at
// der sker en ny scanning/dispatch.
const SYNC_INTERVAL_MS = 200

function sameLampState(a: LampState, b: LampState): boolean {
  return a.color === b.color && a.pattern === b.pattern
}

export function useLampSync(state: CheckoutState): void {
  const lamp = useLamp()
  const lastStateRef = useRef<LampState | null>(null)
  const stateRef = useRef(state)
  const previousAdminOpenRef = useRef(state.adminOpen)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // force: true sender lampens aktuelle tilstand igen, uanset om den er
  // uændret siden sidst. Bruges når instruktørpanelets testknapper (som
  // sender direkte til lampen, forbi denne synkronisering) eller selve
  // Arduino-forbindelsen kan have ladet lampen vise noget andet end kassens
  // tilstand.
  const sync = useCallback(
    (force: boolean) => {
      const next = lampStateFor(stateRef.current, Date.now())
      if (
        !force &&
        lastStateRef.current !== null &&
        sameLampState(lastStateRef.current, next)
      ) {
        return
      }
      lastStateRef.current = next
      if (next.color === 'off') {
        lamp.off()
      } else {
        lamp.show(next.color, next.pattern)
      }
    },
    [lamp],
  )

  useEffect(() => {
    // Tvinger en resend, hvis instruktørpanelet lige er blevet lukket.
    const adminJustClosed = previousAdminOpenRef.current && !state.adminOpen
    previousAdminOpenRef.current = state.adminOpen

    sync(adminJustClosed)

    const interval = setInterval(() => sync(false), SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [state, sync])

  useEffect(() => {
    // Tvinger en resend, når forbindelsen til Arduinoen (gen)oprettes, så
    // lampen altid matcher kassen igen.
    return lamp.subscribeConnectionStatus((status) => {
      if (status === 'connected') {
        sync(true)
      }
    })
  }, [lamp, sync])
}
