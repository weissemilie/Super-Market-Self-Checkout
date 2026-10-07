import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useBarcodeScanner } from '../scanner/useBarcodeScanner'
import { beep, errorAlarm, success } from '../sound'
import { createInitialState, posthusReducer } from './posthusReducer'
import { loadPosthusData, savePosthusData } from './posthusStorage'
import type { PosthusAction, PosthusState } from './types'

const TICK_INTERVAL_MS = 500
const MAX_RECENT_SCANS = 10

export interface RecentScan {
  id: number
  code: string
  time: number
}

export interface UsePosthusResult {
  state: PosthusState
  dispatch: (action: PosthusAction) => void
  handleScan: (code: string) => void
  recentScans: RecentScan[]
}

export function usePosthus(): UsePosthusResult {
  const [state, dispatch] = useReducer(
    posthusReducer,
    undefined,
    () => createInitialState(loadPosthusData()),
  )
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const nextScanId = useRef(0)

  useEffect(() => {
    savePosthusData({ parcels: state.parcels, stats: state.stats })
  }, [state.parcels, state.stats])

  const handleScan = useCallback((code: string) => {
    beep()
    const now = Date.now()
    setRecentScans((previous) =>
      [{ id: nextScanId.current++, code, time: now }, ...previous].slice(
        0,
        MAX_RECENT_SCANS,
      ),
    )
    dispatch({ type: 'SCAN', code, now })
  }, [])

  useBarcodeScanner(handleScan)

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() })
    }, TICK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  // Lyd efter hvad skærmen viser: succes ved modtagelse og udlevering, alarm
  // ved dobbelt indlevering, ukendt kode og forkert pakke.
  const previousActivityRef = useRef(state.activity)
  useEffect(() => {
    const previous = previousActivityRef.current
    const activity = state.activity
    previousActivityRef.current = activity
    if (activity === previous) {
      return
    }
    if (activity.kind === 'received' || activity.kind === 'delivered') {
      success()
    } else if (activity.kind === 'duplicate' || activity.kind === 'unknown') {
      errorAlarm()
    } else if (
      activity.kind === 'pickup' &&
      activity.wrongUntil !== null &&
      !(previous.kind === 'pickup' && previous.wrongUntil === activity.wrongUntil)
    ) {
      errorAlarm()
    }
  }, [state.activity])

  return { state, dispatch, handleScan, recentScans }
}
