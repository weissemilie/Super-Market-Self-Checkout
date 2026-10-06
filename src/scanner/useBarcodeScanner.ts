import { useEffect, useRef } from 'react'

const MIN_CODE_LENGTH = 4
const MAX_INTERVAL_MS = 50
const RESET_TIMEOUT_MS = 100

export interface ScanBufferState {
  buffer: string
  lastCharTime: number | null
  timingValid: boolean
}

export const initialScanBufferState: ScanBufferState = {
  buffer: '',
  lastCharTime: null,
  timingValid: true,
}

export function addCharToBuffer(
  state: ScanBufferState,
  char: string,
  time: number,
): ScanBufferState {
  if (
    state.lastCharTime !== null &&
    time - state.lastCharTime > RESET_TIMEOUT_MS
  ) {
    return { buffer: char, lastCharTime: time, timingValid: true }
  }

  const gap = state.lastCharTime === null ? 0 : time - state.lastCharTime
  const timingValid =
    state.lastCharTime === null ? true : state.timingValid && gap <= MAX_INTERVAL_MS

  return {
    buffer: state.buffer + char,
    lastCharTime: time,
    timingValid,
  }
}

export function completeScan(state: ScanBufferState): { code: string | null } {
  const cleaned = state.buffer.toUpperCase().replace(/\s+/g, '')
  if (cleaned.length >= MIN_CODE_LENGTH && state.timingValid) {
    return { code: cleaned }
  }
  return { code: null }
}

export function useBarcodeScanner(onScan: (code: string) => void): void {
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const stateRef = useRef<ScanBufferState>(initialScanBufferState)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (event.key === 'Enter') {
        const { code } = completeScan(stateRef.current)
        stateRef.current = initialScanBufferState
        if (code) {
          onScanRef.current(code)
        }
        return
      }

      if (event.key.length !== 1) {
        return
      }

      event.preventDefault()
      stateRef.current = addCharToBuffer(stateRef.current, event.key, Date.now())
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
