import { describe, expect, it } from 'vitest'
import { HINT_DELAY_MS, shouldShowHint } from './errorHint'

describe('shouldShowHint', () => {
  it('viser ikke hintet før 90 sekunder er gået', () => {
    expect(shouldShowHint(0, 0)).toBe(false)
    expect(shouldShowHint(0, HINT_DELAY_MS - 1)).toBe(false)
    expect(shouldShowHint(1000, 1000 + HINT_DELAY_MS - 1)).toBe(false)
  })

  it('viser hintet lige når 90 sekunder er gået, og efter', () => {
    expect(shouldShowHint(0, HINT_DELAY_MS)).toBe(true)
    expect(shouldShowHint(1000, 1000 + HINT_DELAY_MS)).toBe(true)
    expect(shouldShowHint(0, HINT_DELAY_MS + 60000)).toBe(true)
  })
})
