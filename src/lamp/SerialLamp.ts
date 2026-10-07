import type { LampColor } from '../data'
import type {
  LampConnectionStatus,
  LampController,
  LampPattern,
  LampState,
} from './LampController'

// En Arduino Uno/Nano genstarter, når porten åbnes, og er et par sekunder om
// at være klar (plus en kort opstartsrunde i sketchen). Derfor sendes PING
// gentagne gange, i stedet for kun én gang.
const PING_RETRY_INTERVAL_MS = 500
const PING_TOTAL_TIMEOUT_MS = 6000
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
  readonly readable: { getReader(): SerialReader } | null
  readonly writable: { getWriter(): SerialWriter } | null
  addEventListener(type: 'disconnect', listener: () => void): void
  removeEventListener(type: 'disconnect', listener: () => void): void
}

interface SerialNavigatorLike {
  requestPort(): Promise<SerialPortLike>
  getPorts(): Promise<SerialPortLike[]>
}

function getSerialNavigator(): SerialNavigatorLike | null {
  if (typeof navigator === 'undefined') {
    return null
  }
  const nav = navigator as Navigator & { serial?: SerialNavigatorLike }
  return nav.serial ?? null
}

function isSerialDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return new URLSearchParams(window.location.search).get('serialDebug') === '1'
}

// Sender én linje og logger den til konsollen, hvis ?serialDebug=1 er sat i
// URL'en. Bruges for alle kommandoer, både PING og LAMP-kommandoerne.
async function writeLine(writer: SerialWriter, line: string): Promise<void> {
  if (isSerialDebugEnabled()) {
    console.info('[SerialLamp]', line)
  }
  await writer.write(new TextEncoder().encode(`${line}\n`))
}

function colorToCommandWord(color: LampColor): string {
  return color.toUpperCase()
}

function patternToCommandWord(pattern: LampPattern): string {
  return pattern.toUpperCase()
}

function commandFor(state: LampState): string {
  if (state.color === 'off') {
    return 'LAMP OFF'
  }
  return `LAMP ${colorToCommandWord(state.color)} ${patternToCommandWord(state.pattern)}`
}

// Sender PING med jævne mellemrum (retryIntervalMs) indtil der kommer en
// linje med PONG, eller den samlede ventetid (totalTimeoutMs) er gået. Alt
// andet Arduinoen måtte skrive undervejs (fx under opstart) ignoreres - der
// kigges kun efter underteksten "PONG" i det modtagne. Afbryder den
// igangværende læsning hvis den samlede tid løber ud, så den ikke efterlades
// hængende.
async function pingUntilPong(
  writer: SerialWriter,
  reader: SerialReader,
  options: { retryIntervalMs: number; totalTimeoutMs: number },
): Promise<boolean> {
  const decoder = new TextDecoder()
  let buffer = ''
  const deadline = Date.now() + options.totalTimeoutMs

  while (Date.now() < deadline) {
    await writeLine(writer, 'PING')

    const roundMs = Math.min(options.retryIntervalMs, deadline - Date.now())
    let roundTimedOut = false
    const roundTimeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        roundTimedOut = true
        resolve()
      }, roundMs)
    })

    while (!roundTimedOut) {
      const outcome = await Promise.race([
        reader.read().then((result) => ({ kind: 'data' as const, result })),
        roundTimeout.then(() => ({ kind: 'timeout' as const })),
      ])

      if (outcome.kind === 'timeout') {
        break
      }

      const { value, done } = outcome.result
      if (done) {
        return false
      }
      if (value) {
        buffer += decoder.decode(value, { stream: true })
      }
      if (buffer.includes('PONG')) {
        return true
      }
    }
  }

  await reader.cancel().catch(() => {})
  return false
}

export class SerialLamp implements LampController {
  private port: SerialPortLike | null
  private writer: SerialWriter | null = null
  private state: LampState = OFF_STATE
  private connectionStatus: LampConnectionStatus = 'disconnected'
  private readonly stateListeners = new Set<(state: LampState) => void>()
  private readonly connectionListeners = new Set<(status: LampConnectionStatus) => void>()
  private readonly handleDisconnect = (): void => {
    this.writer = null
    this.setConnectionStatus('connection-lost')
  }

  // Porten kan injiceres (fx en falsk port i tests). Uden den bruges
  // navigator.serial.requestPort() ved connect().
  constructor(injectedPort: SerialPortLike | null = null) {
    this.port = injectedPort
  }

  async connect(): Promise<void> {
    const port = this.port ?? (await this.requestPort())
    await this.connectToPort(port)
  }

  // Forsøger at genforbinde til en port, brugeren tidligere har givet
  // adgang til, uden at bede om en ny brugerhandling. Fejler stille, hvis
  // der ikke er nogen tidligere port, eller forbindelsen ikke lykkes.
  async tryReconnect(): Promise<void> {
    const serial = getSerialNavigator()
    if (!serial) {
      return
    }
    try {
      const ports = await serial.getPorts()
      const port = ports[0]
      if (!port) {
        return
      }
      await this.connectToPort(port)
    } catch {
      // Stille fejl - brugeren kan altid forbinde manuelt med knappen.
    }
  }

  private async requestPort(): Promise<SerialPortLike> {
    const serial = getSerialNavigator()
    if (!serial) {
      throw new Error('Denne browser understøtter ikke Web Serial API.')
    }
    return serial.requestPort()
  }

  private async connectToPort(port: SerialPortLike): Promise<void> {
    await port.open({ baudRate: 9600 })

    if (!port.writable || !port.readable) {
      await port.close()
      throw new Error('Porten understøtter ikke læsning og skrivning.')
    }

    const writer = port.writable.getWriter()
    const reader = port.readable.getReader()

    const gotPong = await pingUntilPong(writer, reader, {
      retryIntervalMs: PING_RETRY_INTERVAL_MS,
      totalTimeoutMs: PING_TOTAL_TIMEOUT_MS,
    })
    reader.releaseLock()

    if (!gotPong) {
      writer.releaseLock()
      await port.close()
      throw new Error(
        'Arduinoen svarede ikke med PONG inden for 6 sekunder. Tjek kabel og forbindelse.',
      )
    }

    this.port = port
    this.writer = writer
    port.addEventListener('disconnect', this.handleDisconnect)
    this.setConnectionStatus('connected')
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
    const changed = next.color !== this.state.color || next.pattern !== this.state.pattern
    this.state = next
    for (const listener of this.stateListeners) {
      listener(next)
    }
    if (changed) {
      this.sendCommand(next)
    }
  }

  // Sender kun selve kommandoen, hvis tilstanden rent faktisk er ændret -
  // kaldes efter changed-tjekket i setState.
  private sendCommand(state: LampState): void {
    const writer = this.writer
    if (!writer) {
      return
    }
    const line = commandFor(state)
    void writeLine(writer, line).catch(() => {
      // Skrivningen fejlede, fx fordi kablet lige er trukket ud.
      // disconnect-hændelsen opdaterer status separat.
    })
  }
}
