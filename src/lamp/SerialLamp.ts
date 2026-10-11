import type { LampColor } from '../data'
import type {
  LampConnectionStatus,
  LampController,
  LampPattern,
  LampState,
} from './LampController'
import { RelayClient } from './relayClient'

// Lampen sidder på et relæ-board over USB. Firmware og protokol ligger i
// https://github.com/Rud-X/supersupermarked. Baudraten ignoreres af boardet,
// men 115200 bruges som standard. Åbn ALDRIG porten ved 1200 baud, for det
// genstarter boardet i bootloaderen.
const BAUD_RATE = 115200

// Boardet er klar kort efter porten åbnes.
const SETTLE_AFTER_OPEN_MS = 300

// Mens forbindelsen er tabt, forsøges den genoprettet med dette interval.
const RECONNECT_INTERVAL_MS = 1000

// Understøttede boards (USB VID:PID, når firmwaren kører).
const SUPPORTED_BOARDS = [
  { usbVendorId: 0x2886, usbProductId: 0x802d }, // Seeed Wio Terminal
  { usbVendorId: 0x2341, usbProductId: 0x8054 }, // Arduino MKR WiFi 1010
]

const OFF_STATE: LampState = { color: 'off', pattern: 'steady' }

// Minimal form af det Web Serial API faktisk stiller til rådighed - nok til
// at SerialLamp kan bruges med en rigtig port OG en falsk port i tests.
export interface SerialReader {
  read(): Promise<{ value?: Uint8Array; done: boolean }>
  cancel(): Promise<void>
  releaseLock(): void
}

export interface SerialWriter {
  write(data: Uint8Array): Promise<void>
  close(): Promise<void>
  releaseLock(): void
}

export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  getInfo?(): { usbVendorId?: number; usbProductId?: number }
  readonly readable: { getReader(): SerialReader } | null
  readonly writable: { getWriter(): SerialWriter } | null
  addEventListener(type: 'disconnect', listener: () => void): void
  removeEventListener(type: 'disconnect', listener: () => void): void
}

interface SerialNavigatorLike {
  requestPort(options?: {
    filters?: Array<{ usbVendorId: number; usbProductId: number }>
  }): Promise<SerialPortLike>
  getPorts(): Promise<SerialPortLike[]>
}

function getSerialNavigator(): SerialNavigatorLike | null {
  if (typeof navigator === 'undefined') {
    return null
  }
  const nav = navigator as Navigator & { serial?: SerialNavigatorLike }
  return nav.serial ?? null
}

function isSupportedBoard(port: SerialPortLike): boolean {
  const info = port.getInfo?.()
  return SUPPORTED_BOARDS.some(
    (board) =>
      board.usbVendorId === info?.usbVendorId && board.usbProductId === info?.usbProductId,
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface Connection {
  port: SerialPortLike
  writer: SerialWriter
  reader: SerialReader
  client: RelayClient
}

export class SerialLamp implements LampController {
  private port: SerialPortLike | null
  private connection: Connection | null = null
  private connecting = false
  // Ønsket tilstand (relæet kan kun tænde og slukke, så farve og mønster
  // ikke har nogen betydning for selve lampen). relayOn er det seneste
  // boardet har bekræftet, og null når det er ukendt, fx lige efter en
  // forbindelse.
  private isOn = false
  private relayOn: boolean | null = null
  private sending = false
  private connectionStatus: LampConnectionStatus = 'disconnected'
  private reconnectInterval: ReturnType<typeof setInterval> | null = null
  private readonly stateListeners = new Set<(state: LampState) => void>()
  private readonly connectionListeners = new Set<(status: LampConnectionStatus) => void>()
  private readonly handleDisconnect = (): void => {
    this.loseConnection()
  }
  private readonly handleUnload = (): void => {
    this.sendOffBestEffort()
  }

  // Porten kan injiceres (fx en falsk port i tests). Uden den bruges
  // navigator.serial.requestPort() ved connect().
  constructor(injectedPort: SerialPortLike | null = null) {
    this.port = injectedPort
    if (typeof window !== 'undefined') {
      // Siden lukkes (eller fanen skjules) - sluk lampen hvis vi kan.
      // Boardet slukker ikke selv, når appen forsvinder.
      window.addEventListener('pagehide', this.handleUnload)
      window.addEventListener('beforeunload', this.handleUnload)
    }
  }

  async connect(): Promise<void> {
    const port = this.port ?? (await this.requestPort())
    await this.connectToPort(port)
  }

  // Forsøger at genforbinde til en port, brugeren tidligere har givet
  // adgang til, uden at bede om en ny brugerhandling. Fejler stille. Hvis der
  // er flere relæ-boards tilsluttet, vælges ingen automatisk.
  async tryReconnect(): Promise<void> {
    const serial = getSerialNavigator()
    if (!serial || this.connecting || this.connection) {
      return
    }
    try {
      const boards = (await serial.getPorts()).filter(isSupportedBoard)
      if (boards.length !== 1) {
        return
      }
      await this.connectToPort(boards[0])
    } catch {
      // Stille fejl - brugeren kan altid forbinde manuelt med knappen.
    }
  }

  private async requestPort(): Promise<SerialPortLike> {
    const serial = getSerialNavigator()
    if (!serial) {
      throw new Error('Denne browser understøtter ikke Web Serial API.')
    }
    return serial.requestPort({ filters: SUPPORTED_BOARDS })
  }

  private async connectToPort(port: SerialPortLike): Promise<void> {
    if (this.connecting || this.connection) {
      return
    }
    this.connecting = true
    try {
      await port.open({ baudRate: BAUD_RATE })
      if (!port.writable || !port.readable) {
        await port.close()
        throw new Error('Porten understøtter ikke læsning og skrivning.')
      }
      await delay(SETTLE_AFTER_OPEN_MS)

      const writer = port.writable.getWriter()
      const reader = port.readable.getReader()
      const client = new RelayClient(writer, reader)
      const connection: Connection = { port, writer, reader, client }

      // Boardet beholder sin gamle tilstand, så den ønskede tilstand sættes
      // altid eksplicit ved forbindelsen.
      try {
        await this.sendState(client, this.isOn)
      } catch (error) {
        await this.closeConnection(connection)
        throw new Error(
          'Relæ-boardet svarede ikke. Tjek kablet, og at boardet ikke står i bootloader.',
          { cause: error },
        )
      }

      this.port = port
      this.connection = connection
      this.relayOn = this.isOn
      port.addEventListener('disconnect', this.handleDisconnect)
      this.stopReconnecting()
      this.setConnectionStatus('connected')
      // Hvis ønsket tilstand skiftede, mens vi forbandt.
      void this.sendPending()
    } finally {
      this.connecting = false
    }
  }

  getConnectionStatus(): LampConnectionStatus {
    return this.connectionStatus
  }

  subscribeConnectionStatus(listener: (status: LampConnectionStatus) => void): () => void {
    this.connectionListeners.add(listener)
    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  show(color: LampColor, pattern: LampPattern): void {
    this.setState({ color, pattern })
  }

  off(): void {
    this.setState(OFF_STATE)
  }

  subscribe(listener: (state: LampState) => void): () => void {
    this.stateListeners.add(listener)
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  private setConnectionStatus(status: LampConnectionStatus): void {
    this.connectionStatus = status
    for (const listener of this.connectionListeners) {
      listener(status)
    }
  }

  private setState(next: LampState): void {
    this.isOn = next.color !== 'off'
    for (const listener of this.stateListeners) {
      listener(next)
    }
    void this.sendPending()
  }

  // Sender ON eller OFF, hvis boardet ikke allerede viser den ønskede
  // tilstand. Kører kun én kommando ad gangen, og hurtige skift samles til
  // den seneste ønskede tilstand.
  private async sendPending(): Promise<void> {
    if (this.sending) {
      return
    }
    this.sending = true
    try {
      while (this.connection && this.relayOn !== this.isOn) {
        const target = this.isOn
        const { client } = this.connection
        await this.sendState(client, target)
        this.relayOn = target
      }
    } catch {
      this.loseConnection()
    } finally {
      this.sending = false
    }
  }

  // Alt andet end det forventede svar er en fejl.
  private async sendState(client: RelayClient, on: boolean): Promise<void> {
    const command = on ? 'ON' : 'OFF'
    const reply = await client.command(command)
    if (reply !== `OK ${command}`) {
      throw new Error(`Uventet svar fra relæ-boardet: ${reply}`)
    }
  }

  private loseConnection(): void {
    const connection = this.connection
    if (!connection) {
      return
    }
    this.connection = null
    this.port = null
    this.relayOn = null
    connection.port.removeEventListener('disconnect', this.handleDisconnect)
    void this.closeConnection(connection)
    this.setConnectionStatus('connection-lost')
    this.startReconnecting()
  }

  private async closeConnection(connection: Connection): Promise<void> {
    await connection.reader.cancel().catch(() => {})
    connection.reader.releaseLock()
    connection.writer.releaseLock()
    await connection.port.close().catch(() => {})
  }

  private startReconnecting(): void {
    if (this.reconnectInterval === null) {
      this.reconnectInterval = setInterval(() => {
        void this.tryReconnect()
      }, RECONNECT_INTERVAL_MS)
    }
  }

  private stopReconnecting(): void {
    if (this.reconnectInterval !== null) {
      clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }
  }

  // Bedste forsøg på at slukke lampen, uden at vente på svar - bruges når
  // siden lukkes. Kan ikke garanteres at nå frem, men forsøges altid.
  private sendOffBestEffort(): void {
    const connection = this.connection
    if (!connection) {
      return
    }
    this.isOn = false
    void connection.writer.write(new TextEncoder().encode('OFF\n')).catch(() => {})
  }
}
