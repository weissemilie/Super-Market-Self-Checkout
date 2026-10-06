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
    // Kassen bliver i ERROR lidt endnu, så "Problemet er løst" kan ses.
    state = scan(state, 'KORT01', 200)
    state = scan(state, 'KORT03', 300)
    expect(state.mode).toBe('ERROR')
    expect(state.error?.resolvedAt).toBe(300)

    state = checkoutReducer(state, { type: 'TICK', now: 300 + 2000 })
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
    expect(state.mode).toBe('ERROR')
    expect(state.error?.resolvedAt).toBe(10200)
    expect(state.stats.errorsSolved).toBe(1)
    expect(state.stats.solveTimesMs).toEqual([10200 - 0])

    state = checkoutReducer(state, { type: 'TICK', now: 10200 + 2000 })
    expect(state.mode).toBe('SHOPPING')
    expect(state.error).toBeNull()
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
    expect(state.mode).toBe('ERROR')
    expect(state.error?.resolvedAt).toBe(1200)
    expect(state.stats.errorsSolved).toBe(1)

    state = checkoutReducer(state, { type: 'TICK', now: 1200 + 2000 })
    expect(state.mode).toBe('PAYING')
    expect(state.error).toBeNull()
  })

  it('gennemspiller E07 med rigtigt kort, forkert kort, straf og korrekt rækkefølge, og gemmer historik', () => {
    let state = createInitialState()
    state = scan(state, MILK_BARCODE, 0)
    state = checkoutReducer(state, { type: 'TRIGGER_ERROR', errorCode: 'E07', now: 100 })

    expect(state.mode).toBe('ERROR')
    expect(state.error?.activeError.code).toBe('E07')
    expect(state.error?.activeError.solution).toEqual(['KORT02', 'KORT08', 'KORT01'])

    // Et rigtigt kort: progress stiger, og der kommer en succes-flash med
    // kortets navn.
    state = scan(state, 'KORT02', 200)
    expect(state.error?.progress).toBe(1)
    expect(state.flash).toEqual({ text: 'Tekniker', kind: 'success', expiresAt: 200 + 2000 })

    // Et forkert kort: progress nulstilles, straffen starter, og der kommer
    // en fejl-flash.
    state = scan(state, 'KORT05', 300)
    expect(state.error?.progress).toBe(0)
    expect(state.error?.penaltyUntil).toBe(300 + 10000)
    expect(state.error?.wrongCardsThisError).toBe(1)
    expect(state.stats.wrongCards).toBe(1)
    expect(state.flash).toEqual({
      text: 'Forkert kort, start forfra',
      kind: 'error',
      expiresAt: 300 + 2000,
    })

    // Et kort mens straffen løber: ignoreres, men giver en info-flash.
    state = scan(state, 'KORT02', 400)
    expect(state.error?.progress).toBe(0)
    expect(state.flash).toEqual({
      text: 'Vent til nedtællingen er færdig',
      kind: 'info',
      expiresAt: 400 + 2000,
    })

    // Ventetid til straffen er overstået (penaltyUntil = 300 + 10000 = 10300).
    state = checkoutReducer(state, { type: 'TICK', now: 10300 })
    expect(state.mode).toBe('ERROR')

    // Den korrekte rækkefølge forfra.
    state = scan(state, 'KORT02', 10400)
    expect(state.error?.progress).toBe(1)

    state = scan(state, 'KORT08', 10500)
    expect(state.error?.progress).toBe(2)

    state = scan(state, 'KORT01', 10600)
    expect(state.mode).toBe('ERROR')
    expect(state.error?.resolvedAt).toBe(10600)
    expect(state.flash).toEqual({
      text: 'Problemet er løst',
      kind: 'success',
      expiresAt: 10600 + 2000,
    })

    const solveTimeMs = 10600 - 100
    expect(state.stats.errorsSolved).toBe(1)
    expect(state.stats.solveTimesMs).toEqual([solveTimeMs])
    expect(state.stats.history).toEqual([{ errorCode: 'E07', solveTimeMs, wrongCards: 1 }])

    // Kassen går tilbage til SHOPPING, når visningstiden for "løst" er omme.
    state = checkoutReducer(state, { type: 'TICK', now: 10600 + 2000 })
    expect(state.mode).toBe('SHOPPING')
    expect(state.error).toBeNull()
  })

  it('ignorerer kortscanninger helt i ventetiden efter en løst fejl, uden flash og uden at tælle som forkert', () => {
    let state = createInitialState()
    state = scan(state, BEER_BARCODE, 0) // trigger E03, solution ["KORT01", "KORT04"]
    state = scan(state, 'KORT01', 100)
    state = scan(state, 'KORT04', 200)

    expect(state.mode).toBe('ERROR')
    expect(state.error?.resolvedAt).toBe(200)
    // Grace-perioden i fejlgeneratoren tæller fra dette tidspunkt.
    expect(state.lastErrorSolvedAt).toBe(200)
    expect(state.flash).toEqual({
      text: 'Problemet er løst',
      kind: 'success',
      expiresAt: 200 + 2000,
    })

    const stateAfterSolve = state

    // Scanning af det kort der ville have været rigtigt, ændrer intet.
    state = scan(state, 'KORT01', 300)
    expect(state).toBe(stateAfterSolve)

    // Scanning af et kort der ville have været forkert, ændrer heller intet
    // - ingen flash, og det tæller ikke som forkert, hverken for denne fejl
    // eller globalt i stats.
    state = scan(state, 'KORT02', 350)
    expect(state).toBe(stateAfterSolve)
    expect(state.stats.wrongCards).toBe(0)
    expect(state.error?.wrongCardsThisError).toBe(0)
    expect(state.flash).toEqual({
      text: 'Problemet er løst',
      kind: 'success',
      expiresAt: 200 + 2000,
    })
  })

  function scanMester(state: CheckoutState, now: number) {
    return scan(state, 'MESTER', now)
  }

  it('MESTER skifter adminOpen i IDLE', () => {
    let state = createInitialState()
    state = scanMester(state, 0)
    expect(state.adminOpen).toBe(true)
    expect(state.mode).toBe('IDLE')

    state = scanMester(state, 100)
    expect(state.adminOpen).toBe(false)
  })

  it('MESTER skifter adminOpen i SHOPPING', () => {
    let state = createInitialState()
    state = scan(state, MILK_BARCODE, 0)
    expect(state.mode).toBe('SHOPPING')

    state = scanMester(state, 100)
    expect(state.adminOpen).toBe(true)
    state = scanMester(state, 200)
    expect(state.adminOpen).toBe(false)
  })

  it('MESTER skifter adminOpen i PAYING', () => {
    let state = createInitialState()
    state = scan(state, MILK_BARCODE, 0)
    state = checkoutReducer(state, { type: 'START_PAYMENT', now: 100 })
    expect(state.mode).toBe('PAYING')

    state = scanMester(state, 200)
    expect(state.adminOpen).toBe(true)
    state = scanMester(state, 300)
    expect(state.adminOpen).toBe(false)
  })

  it('MESTER skifter adminOpen i DONE', () => {
    let state = createInitialState()
    state = scan(state, MILK_BARCODE, 0)
    state = checkoutReducer(state, { type: 'START_PAYMENT', now: 100 })
    state = checkoutReducer(state, { type: 'PAYMENT_DONE', now: 200 })
    expect(state.mode).toBe('DONE')

    state = scanMester(state, 300)
    expect(state.adminOpen).toBe(true)
    state = scanMester(state, 400)
    expect(state.adminOpen).toBe(false)
  })

  it('MESTER skifter adminOpen i ERROR uden at tælle som forkert kort eller ændre fremgangen', () => {
    let state = createInitialState()
    state = scan(state, BEER_BARCODE, 0) // trigger E03, solution ["KORT01", "KORT04"]
    expect(state.mode).toBe('ERROR')
    state = scan(state, 'KORT01', 50)
    expect(state.error?.progress).toBe(1)

    state = scanMester(state, 100)
    expect(state.adminOpen).toBe(true)
    expect(state.mode).toBe('ERROR')
    expect(state.error?.progress).toBe(1)
    expect(state.error?.wrongCardsThisError).toBe(0)
    expect(state.stats.wrongCards).toBe(0)

    state = scanMester(state, 200)
    expect(state.adminOpen).toBe(false)
    expect(state.mode).toBe('ERROR')
    expect(state.error?.progress).toBe(1)
    expect(state.error?.wrongCardsThisError).toBe(0)
    expect(state.stats.wrongCards).toBe(0)

    // Resten af fejlen kan stadig løses normalt bagefter.
    state = scan(state, 'KORT04', 300)
    expect(state.error?.resolvedAt).toBe(300)
  })

  it('ignorerer varescanninger helt, mens instruktørpanelet er åbent', () => {
    let state = createInitialState()
    state = scanMester(state, 0)
    expect(state.adminOpen).toBe(true)

    const stateWhileOpen = state
    state = scan(state, MILK_BARCODE, 100)
    expect(state).toBe(stateWhileOpen)
    expect(state.cart).toEqual([])
  })
})
