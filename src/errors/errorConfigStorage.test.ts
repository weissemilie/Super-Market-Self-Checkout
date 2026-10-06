/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_ADMIN_STATE,
  loadErrorGeneratorConfig,
  saveErrorGeneratorConfig,
} from './errorConfigStorage'

afterEach(() => {
  localStorage.clear()
})

describe('errorConfigStorage', () => {
  it('falder tilbage til standardkonfigurationen, når intet er gemt', () => {
    expect(loadErrorGeneratorConfig()).toEqual(DEFAULT_ADMIN_STATE)
  })

  it('gemmer og læser konfigurationen igen', () => {
    const custom = { preset: 'kaos' as const, enabled: false, enabledErrors: ['E01', 'E04'] }
    saveErrorGeneratorConfig(custom)
    expect(loadErrorGeneratorConfig()).toEqual(custom)
  })

  it('falder tilbage til standard, hvis det gemte preset er ugyldigt', () => {
    localStorage.setItem(
      'spejder-super.error-generator',
      JSON.stringify({ preset: 'umulig', enabled: true, enabledErrors: ['E01'] }),
    )
    expect(loadErrorGeneratorConfig()).toEqual(DEFAULT_ADMIN_STATE)
  })

  it('falder tilbage til standard, hvis enabledErrors ikke er en liste af strenge', () => {
    localStorage.setItem(
      'spejder-super.error-generator',
      JSON.stringify({ preset: 'normal', enabled: true, enabledErrors: 'E01' }),
    )
    expect(loadErrorGeneratorConfig()).toEqual(DEFAULT_ADMIN_STATE)
  })

  it('falder tilbage til standard, hvis det gemte data ikke er gyldig JSON', () => {
    localStorage.setItem('spejder-super.error-generator', '{ugyldig json')
    expect(loadErrorGeneratorConfig()).toEqual(DEFAULT_ADMIN_STATE)
  })
})
