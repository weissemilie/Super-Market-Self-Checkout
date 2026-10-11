import { loadJson, saveJson } from '../storage'
import { COMMON_ENABLED_ERRORS } from './errorEngine'
import type { ErrorPresetName } from './errorEngine'

const STORAGE_KEY = 'spejder-super.error-generator'

export interface ErrorGeneratorAdminState {
  preset: ErrorPresetName
  enabled: boolean
  enabledErrors: string[]
  // Instruktørens egen chance for en tilfældig fejl pr. scannet vare (0 til 1).
  // Mangler den, bruges chancen fra sværhedsgraden.
  chancePerScan?: number
}

export const DEFAULT_ADMIN_STATE: ErrorGeneratorAdminState = {
  preset: 'normal',
  enabled: true,
  enabledErrors: COMMON_ENABLED_ERRORS,
}

function isValidPreset(value: unknown): value is ErrorPresetName {
  return value === 'let' || value === 'normal' || value === 'kaos'
}

function isValidAdminState(value: unknown): value is ErrorGeneratorAdminState {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const v = value as Record<string, unknown>
  return (
    isValidPreset(v.preset) &&
    typeof v.enabled === 'boolean' &&
    Array.isArray(v.enabledErrors) &&
    v.enabledErrors.every((code) => typeof code === 'string') &&
    (v.chancePerScan === undefined ||
      (typeof v.chancePerScan === 'number' && v.chancePerScan >= 0 && v.chancePerScan <= 1))
  )
}

export function loadErrorGeneratorConfig(): ErrorGeneratorAdminState {
  return loadJson(STORAGE_KEY, isValidAdminState) ?? DEFAULT_ADMIN_STATE
}

export function saveErrorGeneratorConfig(adminState: ErrorGeneratorAdminState): void {
  saveJson(STORAGE_KEY, adminState)
}
