// Klient til relæ-boardet. Protokollen er tekst, en linje ad gangen: send
// "ON\n", "OFF\n" eller "STATUS\n" og vent på ét svar, fx "OK ON". Boardet
// skriver også en enkelt "READY" ved opstart, som ignoreres her.
// Firmware og protokol: https://github.com/Rud-X/supersupermarked

const REPLY_TIMEOUT_MS = 1000

interface ReadResult {
  value?: Uint8Array
  done: boolean
}

export interface RelayReader {
  read(): Promise<ReadResult>
}

export interface RelayWriter {
  write(data: Uint8Array): Promise<void>
}

function isSerialDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return new URLSearchParams(window.location.search).get('serialDebug') === '1'
}

export class RelayClient {
  private readonly decoder = new TextDecoder()
  private buffer = ''
  // Den igangværende læsning gemmes, så data ikke går tabt, hvis et svar
  // timer ud, mens læsningen stadig venter.
  private pendingRead: Promise<ReadResult> | null = null

  private readonly writer: RelayWriter
  private readonly reader: RelayReader
  private readonly replyTimeoutMs: number

  constructor(
    writer: RelayWriter,
    reader: RelayReader,
    replyTimeoutMs: number = REPLY_TIMEOUT_MS,
  ) {
    this.writer = writer
    this.reader = reader
    this.replyTimeoutMs = replyTimeoutMs
  }

  // Sender én kommando og returnerer svarlinjen. Kun én kommando ad gangen.
  async command(command: string): Promise<string> {
    await this.writer.write(new TextEncoder().encode(`${command}\n`))
    const deadline = Date.now() + this.replyTimeoutMs

    for (;;) {
      const line = await this.nextLine(deadline)
      if (line !== 'READY') {
        if (isSerialDebugEnabled()) {
          console.info('[Relay]', command, '->', line)
        }
        return line
      }
    }
  }

  private async nextLine(deadline: number): Promise<string> {
    for (;;) {
      const newlineIndex = this.buffer.indexOf('\n')
      if (newlineIndex >= 0) {
        const line = this.buffer.slice(0, newlineIndex).trim()
        this.buffer = this.buffer.slice(newlineIndex + 1)
        if (line) {
          return line
        }
        continue
      }

      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) {
        throw new Error('Relæ-boardet svarede ikke.')
      }

      this.pendingRead ??= this.reader.read()
      const result = await withTimeout(this.pendingRead, remainingMs)
      if (result === null) {
        throw new Error('Relæ-boardet svarede ikke.')
      }
      this.pendingRead = null
      if (result.done) {
        throw new Error('Forbindelsen til relæ-boardet blev lukket.')
      }
      if (result.value) {
        this.buffer += this.decoder.decode(result.value, { stream: true })
      }
    }
  }
}

// Returnerer null, hvis tiden løber ud før løftet er opfyldt.
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}
