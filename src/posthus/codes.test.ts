import { describe, expect, it } from 'vitest'
import { PARCEL_COUNT, parcelEanFor, parseCode, slipEanFor } from './codes'
import { createInitialState, posthusReducer } from './posthusReducer'

describe('EAN-13 stregkoder', () => {
  it('bygger de printede koder fra PDF-filerne', () => {
    expect(parcelEanFor(1)).toBe('5702000000015')
    expect(parcelEanFor(2)).toBe('5702000000022')
    expect(parcelEanFor(40)).toBe('5702000000404')
    expect(slipEanFor(1)).toBe('5703000000012')
    expect(slipEanFor(2)).toBe('5703000000029')
    expect(slipEanFor(40)).toBe('5703000000401')
  })

  it('oversætter EAN-13 til den interne pakke- eller seddelkode', () => {
    expect(parseCode('5702000000015')).toEqual({ kind: 'parcel', code: 'PAKKE001' })
    expect(parseCode('5703000000401')).toEqual({
      kind: 'slip',
      code: 'SEDDEL040',
      parcelCode: 'PAKKE040',
    })
  })

  it('genkender alle 80 koder, og en seddel hører til pakken med samme nummer', () => {
    for (let n = 1; n <= PARCEL_COUNT; n++) {
      const padded = String(n).padStart(3, '0')
      expect(parseCode(parcelEanFor(n))).toEqual({ kind: 'parcel', code: `PAKKE${padded}` })
      expect(parseCode(slipEanFor(n))).toEqual({
        kind: 'slip',
        code: `SEDDEL${padded}`,
        parcelCode: `PAKKE${padded}`,
      })
    }
  })

  it('afviser forkert kontrolciffer og numre uden for 1-40', () => {
    expect(parseCode('5702000000016')).toBeNull()
    expect(parseCode('5703000000013')).toBeNull()
    expect(parseCode('5702000000000')).toBeNull()
    expect(parseCode('5702000000411')).toBeNull()
  })

  it('genkender ikke varernes koder eller andre tal som pakker', () => {
    expect(parseCode('5701000000001')).toBeNull()
    expect(parseCode('5702000000')).toBeNull()
    expect(parseCode('MESTER')).toBeNull()
  })

  it('lader tekstkoderne virke som før', () => {
    expect(parseCode('PAKKE001')).toEqual({ kind: 'parcel', code: 'PAKKE001' })
    expect(parseCode('SEDDEL040')).toEqual({
      kind: 'slip',
      code: 'SEDDEL040',
      parcelCode: 'PAKKE040',
    })
  })

  it('kan køre en hel udlevering med scannede stregkoder', () => {
    const start = createInitialState()
    const state = [
      { type: 'SCAN', code: '5702000000015', now: 1000 },
      { type: 'SCAN', code: '5703000000012', now: 2000 },
      { type: 'SCAN', code: '5702000000015', now: 3000 },
    ].reduce((s, a) => posthusReducer(s, a as Parameters<typeof posthusReducer>[1]), start)
    expect(state.parcels.PAKKE001.status).toBe('udleveret')
    expect(state.activity).toMatchObject({ kind: 'delivered', parcelCode: 'PAKKE001' })
  })
})
