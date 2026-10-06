import { describe, expect, it } from 'vitest'
import {
  addCharToBuffer,
  completeScan,
  initialScanBufferState,
  type ScanBufferState,
} from './useBarcodeScanner'

function scanChars(chars: string, startTime: number, gapMs: number): ScanBufferState {
  let state = initialScanBufferState
  let time = startTime
  for (const char of chars) {
    state = addCharToBuffer(state, char, time)
    time += gapMs
  }
  return state
}

describe('addCharToBuffer og completeScan', () => {
  it('godkender en hurtig scanning på mindst 4 tegn', () => {
    const state = scanChars('ABCD1234', 1000, 5)
    expect(completeScan(state)).toEqual({ code: 'ABCD1234' })
  })

  it('afviser en kode kortere end 4 tegn', () => {
    const state = scanChars('AB', 1000, 5)
    expect(completeScan(state)).toEqual({ code: null })
  })

  it('afviser normal tastetryk med mere end 50 ms mellem tegn', () => {
    const state = scanChars('ABCDEFGH', 1000, 80)
    expect(completeScan(state)).toEqual({ code: null })
  })

  it('nulstiller bufferen hvis der går over 100 ms uden tegn', () => {
    let state = initialScanBufferState
    state = addCharToBuffer(state, 'A', 1000)
    state = addCharToBuffer(state, 'B', 1010)
    state = addCharToBuffer(state, 'C', 1200) // pause på 190 ms, over grænsen
    state = addCharToBuffer(state, 'D', 1210)
    state = addCharToBuffer(state, 'E', 1220)

    expect(state.buffer).toBe('CDE')
    expect(completeScan(state)).toEqual({ code: null })
  })

  it('gør koden til store bogstaver og fjerner mellemrum', () => {
    const state = scanChars('ab cd', 1000, 5)
    expect(completeScan(state)).toEqual({ code: 'ABCD' })
  })
}) 
