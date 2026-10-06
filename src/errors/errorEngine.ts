import type { ErrorDefinition } from '../data'

export interface ErrorConfig {
  enabled: boolean
  chancePerScan: number
  minSecondsBetween: number
  maxSecondsBetween: number
  gracePeriodSeconds: number
  enabledErrors: string[]
}

export type ErrorPresetName = 'let' | 'normal' | 'kaos'

// E02 og E03 udløses kun af reduceren selv (ukendt vare / aldersgrænse) og
// står derfor aldrig i enabledErrors her. De kan stadig udløses manuelt fra
// instruktørpanelet.
export const COMMON_ENABLED_ERRORS = ['E01', 'E04', 'E05', 'E06', 'E07', 'E08']

export const ERROR_PRESETS: Record<ErrorPresetName, ErrorConfig> = {
  let: {
    enabled: true,
    chancePerScan: 0.05,
    minSecondsBetween: 90,
    maxSecondsBetween: 180,
    gracePeriodSeconds: 30,
    enabledErrors: COMMON_ENABLED_ERRORS,
  },
  normal: {
    enabled: true,
    chancePerScan: 0.1,
    minSecondsBetween: 45,
    maxSecondsBetween: 90,
    gracePeriodSeconds: 15,
    enabledErrors: COMMON_ENABLED_ERRORS,
  },
  kaos: {
    enabled: true,
    chancePerScan: 0.25,
    minSecondsBetween: 15,
    maxSecondsBetween: 40,
    gracePeriodSeconds: 5,
    enabledErrors: COMMON_ENABLED_ERRORS,
  },
}

export function pickError(
  errors: ErrorDefinition[],
  enabledCodes: string[],
  lastCode: string | null,
  random: () => number,
): ErrorDefinition | null {
  const enabledSet = new Set(enabledCodes)
  const candidates = errors.filter((error) => enabledSet.has(error.code))

  if (candidates.length === 0) {
    return null
  }

  const withoutLast = candidates.filter((error) => error.code !== lastCode)
  const pool = withoutLast.length > 0 ? withoutLast : candidates

  const totalWeight = pool.reduce((sum, error) => sum + error.weight, 0)
  if (totalWeight <= 0) {
    return null
  }

  let roll = random() * totalWeight
  for (const error of pool) {
    roll -= error.weight
    if (roll < 0) {
      return error
    }
  }

  return pool[pool.length - 1]
}

export function nextDelayMs(config: ErrorConfig, random: () => number): number {
  const minMs = config.minSecondsBetween * 1000
  const maxMs = config.maxSecondsBetween * 1000
  return Math.round(minMs + random() * (maxMs - minMs))
}

// Grace-perioden tæller fra det tidspunkt en fejl blev løst (resolvedAt i
// reduceren, gemt videre i lastErrorSolvedAt når fejlen til sidst ryddes).
export function isWithinGracePeriod(
  lastErrorSolvedAt: number | null,
  now: number,
  gracePeriodSeconds: number,
): boolean {
  if (lastErrorSolvedAt === null) {
    return false
  }
  return now - lastErrorSolvedAt < gracePeriodSeconds * 1000
}
