import type { CheckoutState } from '../checkout/types'
import type { LampState } from './LampController'

const OFF_STATE: LampState = { color: 'off', pattern: 'steady' }

export function lampStateFor(state: CheckoutState, now: number): LampState {
  if (state.mode !== 'ERROR' || !state.error) {
    return OFF_STATE
  }

  if (state.error.resolvedAt !== null) {
    // Fejlen er løst - kassen opfører sig som om den er væk, selvom mode
    // først skifter tilbage om lidt.
    return OFF_STATE
  }

  const { activeError, penaltyUntil } = state.error

  if (penaltyUntil !== null && now < penaltyUntil) {
    return { color: activeError.lampColor, pattern: 'fast' }
  }

  if (activeError.lampColor === 'red') {
    return { color: activeError.lampColor, pattern: 'blink' }
  }

  return { color: activeError.lampColor, pattern: 'steady' }
}
