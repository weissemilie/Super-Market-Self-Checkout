import { describe, expect, it } from 'vitest'
import { createInitialState } from '../checkout/checkoutReducer'
import type { ActiveErrorState, CheckoutState } from '../checkout/types'
import type { ErrorDefinition, LampColor } from '../data'
import { lampStateFor } from './lampStateFor'

function makeError(
  lampColor: LampColor,
  overrides: Partial<ActiveErrorState> = {},
): ActiveErrorState {
  const activeError: ErrorDefinition = {
    code: 'E99',
    title: 'Test fejl',
    message: 'En test fejl.',
    lampColor,
    solution: ['KORT01'],
    hint: 'Test hint.',
    weight: 1,
  }
  return {
    activeError,
    progress: 0,
    resumeMode: 'SHOPPING',
    errorStartedAt: 0,
    penaltyUntil: null,
    wrongCardsThisError: 0,
    resolvedAt: null,
    ...overrides,
  }
}

function stateWith(overrides: Partial<CheckoutState>): CheckoutState {
  return { ...createInitialState(), ...overrides }
}

describe('lampStateFor', () => {
  it('er slukket når mode ikke er ERROR', () => {
    expect(lampStateFor(stateWith({ mode: 'IDLE' }), 0)).toEqual({
      color: 'off',
      pattern: 'steady',
    })
    expect(lampStateFor(stateWith({ mode: 'SHOPPING' }), 0)).toEqual({
      color: 'off',
      pattern: 'steady',
    })
    expect(lampStateFor(stateWith({ mode: 'PAYING' }), 0)).toEqual({
      color: 'off',
      pattern: 'steady',
    })
    expect(lampStateFor(stateWith({ mode: 'DONE' }), 0)).toEqual({
      color: 'off',
      pattern: 'steady',
    })
  })

  it('blinker ved en rød fejl', () => {
    const state = stateWith({ mode: 'ERROR', error: makeError('red') })
    expect(lampStateFor(state, 0)).toEqual({ color: 'red', pattern: 'blink' })
  })

  it('lyser med steady ved en gul fejl', () => {
    const state = stateWith({ mode: 'ERROR', error: makeError('yellow') })
    expect(lampStateFor(state, 0)).toEqual({ color: 'yellow', pattern: 'steady' })
  })

  it('lyser med steady ved en blå fejl', () => {
    const state = stateWith({ mode: 'ERROR', error: makeError('blue') })
    expect(lampStateFor(state, 0)).toEqual({ color: 'blue', pattern: 'steady' })
  })

  it('bruger fast mens straffen for et forkert kort løber', () => {
    const error = makeError('yellow', { penaltyUntil: 1000 })
    const state = stateWith({ mode: 'ERROR', error })
    expect(lampStateFor(state, 0)).toEqual({ color: 'yellow', pattern: 'fast' })
    expect(lampStateFor(state, 999)).toEqual({ color: 'yellow', pattern: 'fast' })
  })

  it('bruger fejlens egen farve under straffen, også for en rød fejl', () => {
    const error = makeError('red', { penaltyUntil: 1000 })
    const state = stateWith({ mode: 'ERROR', error })
    expect(lampStateFor(state, 500)).toEqual({ color: 'red', pattern: 'fast' })
  })

  it('går tilbage til det normale mønster, når straffen er udløbet', () => {
    const error = makeError('yellow', { penaltyUntil: 1000 })
    const state = stateWith({ mode: 'ERROR', error })
    expect(lampStateFor(state, 1000)).toEqual({ color: 'yellow', pattern: 'steady' })
    expect(lampStateFor(state, 2000)).toEqual({ color: 'yellow', pattern: 'steady' })
  })

  it('er slukket når fejlen er løst (resolvedAt sat), selvom mode stadig er ERROR', () => {
    const error = makeError('red', { resolvedAt: 500 })
    const state = stateWith({ mode: 'ERROR', error })
    expect(lampStateFor(state, 500)).toEqual({ color: 'off', pattern: 'steady' })
    expect(lampStateFor(state, 1200)).toEqual({ color: 'off', pattern: 'steady' })
  })
})
