import { describe, expect, it } from 'vitest'
import type { ErrorDefinition } from '../data'
import { errors as realErrors } from '../data'
import { ERROR_PRESETS, isWithinGracePeriod, nextDelayMs, pickError } from './errorEngine'

function makeError(code: string, weight: number): ErrorDefinition {
  return {
    code,
    title: `Titel ${code}`,
    message: `Besked ${code}`,
    lampColor: 'yellow',
    solution: ['KORT01'],
    hint: 'Hint',
    weight,
  }
}

function fixedRandom(...values: number[]): () => number {
  let index = 0
  return () => {
    const value = values[Math.min(index, values.length - 1)]
    index += 1
    return value
  }
}

describe('pickError', () => {
  it('vælger aldrig E02 eller E03, selv hvis de findes i listen af fejl', () => {
    const errors = [makeError('E02', 10), makeError('E03', 10), makeError('E01', 1)]
    const enabledCodes = ['E01']

    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      const picked = pickError(errors, enabledCodes, null, fixedRandom(roll))
      expect(picked?.code).toBe('E01')
    }
  })

  it('udelukker E02/E03 med normal-præsettet og vælger altid blandt de rigtige data', () => {
    const enabledCodes = ERROR_PRESETS.normal.enabledErrors
    expect(enabledCodes).not.toContain('E02')
    expect(enabledCodes).not.toContain('E03')

    for (const roll of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 0.999]) {
      const picked = pickError(realErrors, enabledCodes, null, fixedRandom(roll))
      expect(picked).not.toBeNull()
      expect(['E02', 'E03']).not.toContain(picked?.code)
    }
  })

  it('vælger vægtet efter weight', () => {
    const errors = [makeError('A', 1), makeError('B', 3)]

    expect(pickError(errors, ['A', 'B'], null, fixedRandom(0))?.code).toBe('A')
    expect(pickError(errors, ['A', 'B'], null, fixedRandom(0.1))?.code).toBe('A')
    expect(pickError(errors, ['A', 'B'], null, fixedRandom(0.3))?.code).toBe('B')
    expect(pickError(errors, ['A', 'B'], null, fixedRandom(0.99))?.code).toBe('B')
  })

  it('vælger ikke samme fejl to gange i træk, når flere er aktive', () => {
    const errors = [makeError('A', 1), makeError('B', 1)]

    // Selv et rul der ville pege på 'A' skal give 'B', fordi 'A' lige er kørt.
    const picked = pickError(errors, ['A', 'B'], 'A', fixedRandom(0))
    expect(picked?.code).toBe('B')
  })

  it('vælger samme fejl igen, hvis den er den eneste aktive', () => {
    const errors = [makeError('A', 1)]
    const picked = pickError(errors, ['A'], 'A', fixedRandom(0.5))
    expect(picked?.code).toBe('A')
  })

  it('returnerer null hvis ingen fejl er aktive', () => {
    const errors = [makeError('A', 1)]
    const picked = pickError(errors, [], null, fixedRandom(0.5))
    expect(picked).toBeNull()
  })
})

describe('nextDelayMs', () => {
  it('giver minimumstiden ved random 0', () => {
    const config = ERROR_PRESETS.normal
    expect(nextDelayMs(config, fixedRandom(0))).toBe(config.minSecondsBetween * 1000)
  })

  it('giver en tid mellem min og max ved random tæt på 1', () => {
    const config = ERROR_PRESETS.normal
    const delay = nextDelayMs(config, fixedRandom(0.999999))
    expect(delay).toBeGreaterThan(config.minSecondsBetween * 1000)
    expect(delay).toBeLessThanOrEqual(config.maxSecondsBetween * 1000)
  })

  it('giver midtpunktet ved random 0.5', () => {
    const config = ERROR_PRESETS.normal
    const expected =
      config.minSecondsBetween * 1000 +
      0.5 * (config.maxSecondsBetween - config.minSecondsBetween) * 1000
    expect(nextDelayMs(config, fixedRandom(0.5))).toBe(Math.round(expected))
  })
})

describe('isWithinGracePeriod', () => {
  it('er aldrig i ro-perioden, hvis ingen fejl er løst endnu', () => {
    expect(isWithinGracePeriod(null, 100000, 15)).toBe(false)
  })

  // Ro-perioden tæller fra det tidspunkt fejlen blev løst (resolvedAt i
  // reduceren, som videregives som lastErrorSolvedAt).
  it('tæller fra løsningstidspunktet, ikke fra et andet tidspunkt', () => {
    const resolvedAt = 1000
    const gracePeriodSeconds = 15

    expect(isWithinGracePeriod(resolvedAt, resolvedAt, gracePeriodSeconds)).toBe(true)
    expect(
      isWithinGracePeriod(resolvedAt, resolvedAt + gracePeriodSeconds * 1000 - 1, gracePeriodSeconds),
    ).toBe(true)
    expect(
      isWithinGracePeriod(resolvedAt, resolvedAt + gracePeriodSeconds * 1000, gracePeriodSeconds),
    ).toBe(false)
  })
})
