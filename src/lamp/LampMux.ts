import type { LampColor } from '../data'
import type {
  LampConnectionStatus,
  LampController,
  LampPattern,
  LampState,
} from './LampController'
import { MockLamp } from './MockLamp'
import { SerialLamp } from './SerialLamp'

// SerialLamp's egen genforbindelsesmetode, som ikke er del af den generelle
// LampController-grænseflade. Typet strukturelt, så en test-stub kan bruges
// i stedet for en rigtig SerialLamp.
type SerialLampLike = LampController & { tryReconnect(): Promise<void> }

// Sender til både en MockLamp (så lampen også ses på skærmen) og en
// SerialLamp (den rigtige Arduino, hvis den er forbundet). Hvis SerialLamp
// fejler - fx ingen Arduino tilsluttet - fortsætter MockLamp uberørt.
export class LampMux implements LampController {
  private readonly mock: LampController
  private readonly serial: SerialLampLike

  constructor(
    mock: LampController = new MockLamp(),
    serial: SerialLampLike = new SerialLamp(),
  ) {
    this.mock = mock
    this.serial = serial
  }

  async connect(): Promise<void> {
    await this.mock.connect()
    await this.serial.connect()
  }

  async tryReconnect(): Promise<void> {
    await this.serial.tryReconnect()
  }

  getConnectionStatus(): LampConnectionStatus {
    return this.serial.getConnectionStatus()
  }

  subscribeConnectionStatus(listener: (status: LampConnectionStatus) => void): () => void {
    return this.serial.subscribeConnectionStatus(listener)
  }

  show(color: LampColor, pattern: LampPattern): void {
    this.mock.show(color, pattern)
    this.serial.show(color, pattern)
  }

  off(): void {
    this.mock.off()
    this.serial.off()
  }

  subscribe(listener: (state: LampState) => void): () => void {
    // MockLamp er den visuelle sandhed på skærmen, så UI'et abonnerer på den.
    return this.mock.subscribe(listener)
  }
}
