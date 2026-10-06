import { useEffect, useState } from 'react'
import {
  loadErrorGeneratorConfig,
  saveErrorGeneratorConfig,
  type ErrorGeneratorAdminState,
} from './errorConfigStorage'
import { ERROR_PRESETS } from './errorEngine'
import type { ErrorConfig, ErrorPresetName } from './errorEngine'

export interface UseErrorGeneratorConfigResult {
  preset: ErrorPresetName
  enabled: boolean
  enabledErrors: string[]
  effectiveConfig: ErrorConfig
  setPreset: (preset: ErrorPresetName) => void
  setEnabled: (enabled: boolean) => void
  toggleErrorEnabled: (code: string) => void
}

export function useErrorGeneratorConfig(): UseErrorGeneratorConfigResult {
  const [adminState, setAdminState] = useState<ErrorGeneratorAdminState>(() =>
    loadErrorGeneratorConfig(),
  )

  useEffect(() => {
    saveErrorGeneratorConfig(adminState)
  }, [adminState])

  function setPreset(preset: ErrorPresetName) {
    setAdminState((previous) => ({ ...previous, preset }))
  }

  function setEnabled(enabled: boolean) {
    setAdminState((previous) => ({ ...previous, enabled }))
  }

  function toggleErrorEnabled(code: string) {
    setAdminState((previous) => {
      const isEnabled = previous.enabledErrors.includes(code)
      const enabledErrors = isEnabled
        ? previous.enabledErrors.filter((existing) => existing !== code)
        : [...previous.enabledErrors, code]
      return { ...previous, enabledErrors }
    })
  }

  // E02/E03 udløses kun af reduceren selv og må aldrig ende i generatorens
  // egen liste, uanset hvad der evt. er gemt i localStorage.
  const sanitizedEnabledErrors = adminState.enabledErrors.filter(
    (code) => code !== 'E02' && code !== 'E03',
  )

  const effectiveConfig: ErrorConfig = {
    ...ERROR_PRESETS[adminState.preset],
    enabled: adminState.enabled,
    enabledErrors: sanitizedEnabledErrors,
  }

  return {
    preset: adminState.preset,
    enabled: adminState.enabled,
    enabledErrors: sanitizedEnabledErrors,
    effectiveConfig,
    setPreset,
    setEnabled,
    toggleErrorEnabled,
  }
}
