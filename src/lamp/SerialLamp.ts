import type { LampColor } from '../data'
import type {
  LampConnectionStatus,
  LampController,
  LampPattern,
  LampState,
} from './LampController'

// Et ESP32-board genstarter typisk, når porten åbnes, og er et par sekunder
// om at være klar. Derfor sendes PING gentagne gange, i stedet for kun én
// gang.
const PING_RETRY_INTERVAL_MS = 500
const PING_TOTAL_TIMEOUT_MS = 6000

// Så længe der er forbindelse, gentages den aktuelle kommando (ON/OFF) med
// dette interval, så firmwaren kan se at appen stadig kører (dens egen
// watchdog slukker relæet automatisk efter 15 sekunder uden en kommando).
const KEEP_ALIVE_INTERVAL_MS = 5000

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
  setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>
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
// URL'en. Bruges for alle kommandoer: PING, ON og OFF.
async function writeLine(writer: SerialWriter, line: string): Promise<void> {
  if (isSerialDebugEnabled()) {
    console.info('[SerialLamp]', line)
  }
  await writer.write(new TextEncoder().encode(`${line}\n`))
}

// Sender PING med jævne mellemrum (retryIntervalMs) indtil der kommer en
// linje med PONG, eller den samlede ventetid (totalTimeoutMs) er gået. Alt
// andet boardet måtte skrive undervejs (fx under opstart) ignoreres - der
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
  // Lampen kender til farve og mønster (til MockLampView), men relæet kan
  // kun tænde og slukke - det er det eneste der afgør om der sendes en ny
  // kommando over seriel.
  private isOn = false
  private connectionStatus: LampConnectionStatus = 'disconnected'
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null
  private readonly stateListeners = new Set<(state: LampState) => void>()
  private readonly connectionListeners = new Set<(status: LampConnectionStatus) => void>()
  private readonly handleDisconnect = (): void => {
    this.stopKeepAlive()
    this.writer = null
    this.setConnectionStatus('connection-lost')
  }
  private readonly handleUnload = (): void => {
    this.sendOffBestEffort()
  }

  // Porten kan injiceres (fx en falsk port i tests). Uden den bruges
  // navigator.serial.requestPort() ved connect().
  constructor(injectedPort: SerialPortLike | null = null) {
    this.port = injectedPort
    if (typeof window !== 'undefined') {
      // Siden lukkes (eller fanen skjules på mobil) - sluk lampen hvis vi
      // kan, så den ikke bliver hængende på tændt.
      window.addEventListener('pagehide', this.handleUnload)
      window.addEventListener('beforeunload', this.handleUnload)
    }
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
    await port.open({ baudRate: 115200 })

    // ESP32-boardet genstarter typisk når porten åbnes (DTR/RTS styrer
    // reset-pinnen på mange USB-seriel-chips). Sæt dem til false, så boardet
    // ikke bliver holdt i en permanent reset-tilstand.
    await port.setSignals({ dataTerminalReady: false, requestToSend: false })

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
        'ESP32-boardet svarede ikke med PONG inden for 6 sekunder. Tjek kabel og forbindelse.',
      )
    }

    this.port = port
    this.writer = writer
    port.addEventListener('disconnect', this.handleDisconnect)
    this.setConnectionStatus('connected')
    this.startKeepAlive()
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
    const nextIsOn = next.color !== 'off'
    const changed = nextIsOn !== this.isOn
    this.isOn = nextIsOn
    for (const listener of this.stateListeners) {
      listener(next)
    }
    if (changed) {
      this.sendCommand()
    }
  }

  // Relæet kan kun tænde og slukke, så farve og mønster fylder intet i selve
  // kommandoen - de bruges kun til at vise lampen på skærmen (MockLamp).
  private sendCommand(): void {
    const writer = this.writer
    if (!writer) {
      return
    }
    const line = this.isOn ? 'ON' : 'OFF'
    void writeLine(writer, line).catch(() => {
      // Skrivningen fejlede, fx fordi kablet lige er trukket ud.
      // disconnect-hændelsen opdaterer status separat.
    })
  }

  private startKeepAlive(): void {
    this.stopKeepAlive()
    this.keepAliveInterval = setInterval(() => {
      this.sendCommand()
    }, KEEP_ALIVE_INTERVAL_MS)
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval !== null) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }
  }

  // Bedste forsøg på at slukke lampen, uden at vente på svar - bruges når
  // siden lukkes. Kan ikke garanteres at nå frem (fx hvis kablet allerede er
  // trukket ud), men forsøges altid når der er en forbindelse.
  private sendOffBestEffort(): void {
    const writer = this.writer
    if (!writer) {
      return
    }
    this.isOn = false
    void writer.write(new TextEncoder().encode('OFF\n')).catch(() => {})
  }
}
