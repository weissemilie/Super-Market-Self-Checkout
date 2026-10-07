import type { LampColor } from '../data'

export type LampPattern = 'steady' | 'blink' | 'fast'

export interface LampState {
  color: LampColor
  pattern: LampPattern
}

// 'connection-lost' er forskellig fra 'disconnected': den bruges når kablet
// trækkes ud efter en tidligere succesfuld forbindelse.
export type LampConnectionStatus = 'disconnected' | 'connected' | 'connection-lost'

export interface LampController {
  connect(): Promise<void>
  getConnectionStatus(): LampConnectionStatus
  subscribeConnectionStatus(listener: (status: LampConnectionStatus) => void): () => void
  show(color: LampColor, pattern: LampPattern): void
  off(): void
  subscribe(listener: (state: LampState) => void): () => void
}

export type { LampColor }
