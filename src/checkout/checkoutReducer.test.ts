import { describe, expect, it } from 'vitest'
import {
  checkoutReducer,
  createInitialState,
  DEFAULT_SETTINGS,
  priceFromRoll,
  UNKNOWN_PRICE_MAX_DKK,
  UNKNOWN_PRICE_MIN_DKK,
} from './checkoutReducer'
import type { CheckoutState, ScanRolls } from './types'

const MILK_BARCODE = '5701000000001'
const BREAD_BARCODE = '5701000000002'
const BEER_BARCODE = '5701000000014'
const UNKNOWN_BARCODE = '5701999999999'

const NO_ERROR_ROLL: ScanRolls = { price: 0.5, error: 0.9 }

function scan(state: CheckoutState, code: string, now: number, rolls: ScanRolls = NO_ERROR_ROLL) {
  return checkoutReducer(state, { type: 'SCAN', code, now, rolls })
}

describe('checkoutReducer', () => {
  it('gennemfører et normalt køb fra IDLE til DONE og tilbage til IDLE', () => {
    let state = createInitialState()

    state = scan(state, MILK_BARCODE, 0)
    expect(state.mode).toBe('SHOPPING')
    expect(state.cart).toEqual([
      { barcode: MILK_BARCODE, name: 'Øko mælk 1 liter', priceDkk: 13.95, quantity: 1 },
    ])

    state = scan(state, BREAD_BARCODE, 100)
    expect(state.cart).toHaveLength(2)
    expect(state.stats.itemsScanned).toBe(2)

    state = checkoutReducer(state, { type: 'START_PAYMENT', now: 1000 })
    expect(state.mode).toBe('PAYING')

    state = checkoutReducer(state, { type: 'PAYMENT_DONE', now: 2000 })
    expect(state.mode).toBe('DONE')
    expect(state.cart).toEqual([])
    expect(state.doneAt).toBe(2000)
    expect(state.lastReceipt).toEqual({
      items: [
        { barcode: MILK_BARCODE, name: 'Øko mælk 1 liter', priceDkk: 13.95, quantity: 1 },
        { barcode: BREAD_BARCODE, name: 'Rugbrød', priceDkk: 24.95, quantity: 1 },
      ],
      totalDkk: 13.95 + 24.95,
    })

    state = checkoutReducer(state, { type: 'TICK', now: 2000 + 7000 })
    expect(state.mode).toBe('DONE')
    expect(state.lastReceipt).not.toBeNull()

    state = checkoutReducer(state, { type: 'TICK', now: 2000 + 8000 })
    expect(state.mode).toBe('IDLE')
    expect(state.doneAt).toBeNull()
    expect(state.lastReceipt).toBeNull()
  })

  it('lægger en ukendt vare i kurven med samme pris ved gentagne scanninger (accept-mode)', () => {
    let state = createInitialState()

    state = scan(state, UNKNOWN_BARCODE, 0, { price: 0.5, error: 0.9 })
    expect(state.mode).toBe('SHOPPING')
    expect(state.cart).toEqual([
      { barcode: UNKNOWN_BARCODE, name: 'Ukendt vare', priceDkk: 30, quantity: 1 },
    ])

    state = scan(state, UNKNOWN_BARCODE, 100, { price: 0.1, error: 0.9 })
    expect(state.cart).toEqual([
      { barcode: UNKNOWN_BARCODE, name: 'Ukendt vare', priceDkk: 30, quantity: 2 },
    ])
  })

  it('ruller E02-terningen på ny ved hver scanning af samme ukendte kode, men husker prisen', () => {
    let state = createInitialState()

    // 1. scanning: højt fejl-rul, varen accepteres og prisen fastlåses til 30 kr.
    state = scan(state, UNKNOWN_BARCODE, 0, { price: 0.5, error: 0.9 })
    expect(state.mode).toBe('SHOPPING')
    expect(state.cart).toEqual([
      { barcode: UNKNOWN_BARCODE, name: 'Ukendt vare', priceDkk: 30, quantity: 1 },
    ])

    // 2. scanning af samme kode: lavt fejl-rul udløser E02 denne gang, selvom
    // koden er scannet før. Varen lægges ikke i kurven igen.
    state = scan(state, UNKNOWN_BARCODE, 100, { price: 0.9, error: 0.1 })
    expect(state.mode).toBe('ERROR')
    expect(state.error?.activeError.code).toBe('E02')
    expect(state.cart).toEqual([
      { barcode: UNKNOWN_BARCODE, name: 'Ukendt vare', priceDkk: 30, quantity: 1 },
    ])

    // Løs E02 (solution ["KORT01", "KORT03"]) for at kunne scanne videre.
    state = scan(state, 'KORT01', 200)
    state = scan(state, 'KORT03', 300)
    expect(state.mode).toBe('SHOPPING')

    // 3. scanning af samme kode: terningen rulles igen og slår ikke denne
    // gang. Prisen er stadig 30 kr. - ikke genberegnet fra det nye price-rul.
    state = scan(state, UNKNOWN_BARCODE, 400, { price: 0.2, error: 0.9 })
    expect(state.mode).toBe('SHOPPING')
    expect(state.cart).toEqual([
      { barcode: UNKNOWN_BARCODE, name: 'Ukendt vare', priceDkk: 30, quantity: 2 },
    ])
  })

  it('priceFromRoll giver altid en pris mellem 10 og 50 kr, der ender på ,95 eller ,00', () => {
    const rolls = [0, 0.01, 0.1, 0.25, 0.37, 0.5, 0.63, 0.8, 0.95, 0.999]

    for (const roll of rolls) {
      const price = priceFromRoll(roll)
      const cents = Math.round(price * 100) % 100

      expect(price).toBeGreaterThanOrEqual(UNKNOWN_PRICE_MIN_DKK)
      expect(price).toBeLessThanOrEqual(UNKNOWN_PRICE_MAX_DKK)
      expect(cents === 0 || cents === 95).toBe(true)
    }

    // Styret af rolls.price: et lavere rul giver aldrig en højere pris.
    expect(priceFromRoll(0)).toBeLessThan(priceFromRoll(0.5))
    expect(priceFromRoll(0.5)).toBeLessThan(priceFromRoll(0.99))
    expect(priceFromRoll(0)).toBe(UNKNOWN_PRICE_MIN_DKK)
  })

  it('går i ERROR med E02 ved en ukendt vare i accept-mode, hvis fejl-rullet slår igennem', () => {
    let state = createInitialState()

    state = scan(state, UNKNOWN_BARCODE, 0, { price: 0.5, error: 0.1 })
    expect(state.mode).toBe('ERROR')
    expect(state.error?.activeError.code).toBe('E02')
    expect(state.cart).toEqual([])
  })

  it('går altid i ERROR med E02 ved en ukendt vare, når unknownProductMode er "error"', () => {
    let state = createInitialState({
      ...DEFAULT_SETTINGS,
      unknownProductMode: 'error',
    })

    state = scan(state, UNKNOWN_BARCODE, 0, { price: 0.5, error: 0.9 })
    expect(state.mode).toBe('ERROR')
    expect(state.error?.activeError.code).toBe('E02')
    expect(state.cart).toEqual([])
  })

  it('lægger en aldersbegrænset vare i kurven og går i ERROR med E03', () => {
    let state = createInitialState()

    state = scan(state, BEER_BARCODE, 0)
    expect(state.cart).toEqual([
      { barcode: BEER_BARCODE, name: 'Pilsner øl, 500 ml', priceDkk: 14.95, quantity: 1 },
    ])
    expect(state.mode).toBe('ERROR')
    expect(state.error?.activeError.code).toBe('E03')
    expect(state.error?.resumeMode).toBe('SHOPPING')
    expect(state.error?.progress).toBe(0)
  })

  it('giver straf ved forkert kort og låser op når det rigtige kort scannes efter straffen', () => {
    let state = createInitialState()
    state = scan(state, BEER_BARCODE, 0) // trigger E03, solution ["KORT01", "KORT04"]
    expect(state.error?.activeError.solution).toEqual(['KORT01', 'KORT04'])

    // Forkert kort
    state = scan(state, 'KORT02', 100)
    expect(state.error?.progress).toBe(0)
    expect(state.stats.wrongCards).toBe(1)
    expect(state.error?.penaltyUntil).toBe(100 + 10000)

    // Forsøg mens straffen stadig gælder - ignoreres
    state = scan(state, 'KORT01', 200)
    expect(state.error?.progress).toBe(0)

    // Efter straffen er udløbet
    state = scan(state, 'KORT01', 10100)
    expect(state.error?.progress).toBe(1)

    state = scan(state, 'KORT04', 10200)
    expect(state.mode).toBe('SHOPPING')
    expect(state.error).toBeNull()
    expect(state.stats.errorsSolved).toBe(1)
    expect(state.stats.solveTimesMs).toEqual([10200 - 0])
  })

  it('løser en fejl udløst under betaling og vender tilbage til PAYING', () => {
    let state = createInitialState()
    state = scan(state, MILK_BARCODE, 0)
    state = checkoutReducer(state, { type: 'START_PAYMENT', now: 500 })
    expect(state.mode).toBe('PAYING')

    state = checkoutReducer(state, {
      type: 'TRIGGER_ERROR',
      errorCode: 'E05',
      now: 1000,
    })
    expect(state.mode).toBe('ERROR')
    expect(state.error?.resumeMode).toBe('PAYING')
    expect(state.error?.activeError.solution).toEqual(['KORT02', 'KORT06'])

    state = scan(state, 'KORT02', 1100)
    expect(state.error?.progress).toBe(1)

    state = scan(state, 'KORT06', 1200)
    expect(state.mode).toBe('PAYING')
    expect(state.error).toBeNull()
    expect(state.stats.errorsSolved).toBe(1)
  })
})
