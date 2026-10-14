import { useEffect, useRef } from 'react'
import type { PosthusState } from '../posthus/types'
import type { LampState } from './LampController'
import { posthusLampStateFor } from './posthusLampState'
import { useLamp } from './useLamp'

function apply(lamp: ReturnType<typeof useLamp>, next: LampState): void {
  if (next.color === 'off') {
    lamp.off()
  } else {
    lamp.show(next.color, next.pattern)
  }
}

// Holder lampen i takt med PostSyd. Sender igen, når forbindelsen
// (gen)oprettes, og når instruktørpanelet lukkes (testknapperne dér styrer
// lampen direkte).
export function usePosthusLampSync(state: PosthusState): void {
  const lamp = useLamp()
  const stateRef = useRef(state)
  const previousAdminOpenRef = useRef(state.adminOpen)
  const lastRef = useRef<LampState | null>(null)

  useEffect(() => {
    stateRef.current = state
    const next = posthusLampStateFor(state)
    const adminJustClosed = previousAdminOpenRef.current && !state.adminOpen
    previousAdminOpenRef.current = state.adminOpen

    const last = lastRef.current
    if (!adminJustClosed && last && last.color === next.color && last.pattern === next.pattern) {
      return
    }
    lastRef.current = next
    apply(lamp, next)
  }, [state, lamp])

  useEffect(() => {
    return lamp.subscribeConnectionStatus((status) => {
      if (status === 'connected') {
        const next = posthusLampStateFor(stateRef.current)
        lastRef.current = next
        apply(lamp, next)
      }
    })
  }, [lamp])
}
