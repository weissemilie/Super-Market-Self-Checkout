import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    function sync() {
      const next = lampStateFor(state, Date.now())
      if (lastStateRef.current !== null && sameLampState(lastStateRef.current, next)) {
        return
      }
      lastStateRef.current = next
      if (next.color === 'off') {
        lamp.off()
      } else {
        lamp.show(next.color, next.pattern)
      }
    }

    sync()
    const interval = setInterval(sync, SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [state, lamp])
}
