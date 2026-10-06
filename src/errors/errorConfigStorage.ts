import { loadJson, saveJson } from '../storage'
import { COMMON_ENABLED_ERRORS } from './errorEngine'
import type { ErrorPresetName } from './errorEngine'

const STORAGE_KEY = 'spejder-super.error-generator'

export interface ErrorGeneratorAdminState {
  preset: ErrorPresetName
  enabled: boolean
  enabledErrors: string[]
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
    v.enabledErrors.every((code) => typeof code === 'string')
  )
}

export function loadErrorGeneratorConfig(): ErrorGeneratorAdminState {
  return loadJson(STORAGE_KEY, isValidAdminState) ?? DEFAULT_ADMIN_STATE
}

export function saveErrorGeneratorConfig(adminState: ErrorGeneratorAdminState): void {
  saveJson(STORAGE_KEY, adminState)
}
