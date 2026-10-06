import type { LampColor } from '../data'

export type LampPattern = 'steady' | 'blink' | 'fast'

export interface LampState {
  color: LampColor
  pattern: LampPattern
}

export interface LampController {
  connect(): Promise<void>
  isConnected(): boolean
  show(color: LampColor, pattern: LampPattern): void
  off(): void
  subscribe(listener: (state: LampState) => void): () => void
}

export type { LampColor }
