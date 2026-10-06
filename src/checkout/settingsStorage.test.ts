/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './checkoutReducer'
import { loadSettings, saveSettings } from './settingsStorage'

afterEach(() => {
  localStorage.clear()
})

describe('settingsStorage', () => {
  it('falder tilbage til standardindstillinger, når intet er gemt', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('gemmer og læser indstillinger igen', () => {
    saveSettings({ unknownProductMode: 'error', unknownErrorChance: 0.42 })
    expect(loadSettings()).toEqual({ unknownProductMode: 'error', unknownErrorChance: 0.42 })
  })

  it('falder tilbage til standard, hvis det gemte data er ugyldigt', () => {
    localStorage.setItem('spejder-super.settings', JSON.stringify({ foo: 'bar' }))
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('falder tilbage til standard, hvis det gemte data ikke er gyldig JSON', () => {
    localStorage.setItem('spejder-super.settings', '{ugyldig json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('falder tilbage til standard, hvis unknownErrorChance er uden for 0-1', () => {
    localStorage.setItem(
      'spejder-super.settings',
      JSON.stringify({ unknownProductMode: 'accept', unknownErrorChance: 1.5 }),
    )
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
