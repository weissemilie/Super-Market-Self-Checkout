import { loadJson, saveJson } from '../storage'
import { DEFAULT_SETTINGS } from './checkoutReducer'
import type { CheckoutSettings } from './types'

const STORAGE_KEY = 'spejder-super.settings'

function isValidSettings(value: unknown): value is CheckoutSettings {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const v = value as Record<string, unknown>
  return (
    (v.unknownProductMode === 'error' || v.unknownProductMode === 'accept') &&
    typeof v.unknownErrorChance === 'number' &&
    v.unknownErrorChance >= 0 &&
    v.unknownErrorChance <= 1
  )
}

export function loadSettings(): CheckoutSettings {
  return loadJson(STORAGE_KEY, isValidSettings) ?? DEFAULT_SETTINGS
}

export function saveSettings(settings: CheckoutSettings): void {
  saveJson(STORAGE_KEY, settings)
}
