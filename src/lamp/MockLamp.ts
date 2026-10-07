import type { LampColor } from '../data'
import type {
  LampConnectionStatus,
  LampController,
  LampPattern,
  LampState,
} from './LampController'

const OFF_STATE: LampState = { color: 'off', pattern: 'steady' }

export class MockLamp implements LampController {
  private state: LampState = OFF_STATE
  private readonly listeners = new Set<(state: LampState) => void>()

  async connect(): Promise<void> {
    // Ingen rigtig forbindelse at oprette - lampen er allerede en mock.
  }

  getConnectionStatus(): LampConnectionStatus {
    return 'connected'
  }

  subscribeConnectionStatus(): () => void {
    // Status ændrer sig aldrig for en mock, så der er intet at melde.
    return () => {}
  }

  show(color: LampColor, pattern: LampPattern): void {
    this.setState({ color, pattern })
  }

  off(): void {
    this.setState(OFF_STATE)
  }

  subscribe(listener: (state: LampState) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private setState(next: LampState): void {
    this.state = next
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}
