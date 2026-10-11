/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SerialLamp } from './SerialLamp'
import type { SerialPortLike, SerialReader, SerialWriter } from './SerialLamp'

interface ReadResult {
  value?: Uint8Array
  done: boolean
}

interface FakeOptions {
  // 'silent' svarer aldrig, 'wrong' svarer med en fejl.
  behaviour?: 'ok' | 'silent' | 'wrong'
  sendReadyAtOpen?: boolean
}

// Falsk relæ-board, der svarer "OK ON" / "OK OFF" på hver kommando.
function createFakeBoard(options: FakeOptions = {}) {
  const behaviour = options.behaviour ?? 'ok'
  const written: string[] = []
  const baudRates: number[] = []
  const disconnectListeners: Array<() => void> = []
  const queue: Uint8Array[] = []
  let pending: ((result: ReadResult) => void) | null = null
  let closeCalls = 0

  function push(text: string) {
    const data = new TextEncoder().encode(text)
    if (pending) {
      const resolve = pending
      pending = null
      resolve({ value: data, done: false })
    } else {
      queue.push(data)
    }
  }

  if (options.sendReadyAtOpen) {
    push('READY\r\n')
  }

  const reader: SerialReader = {
    read: () =>
      new Promise<ReadResult>((resolve) => {
        const queued = queue.shift()
        if (queued) {
          resolve({ value: queued, done: false })
        } else {
          pending = resolve
        }
      }),
    async cancel() {
      if (pending) {
        const resolve = pending
        pending = null
        resolve({ done: true })
      }
    },
    releaseLock() {},
  }

  const writer: SerialWriter = {
    async write(data) {
      const line = new TextDecoder().decode(data)
      written.push(line)
      const command = line.trim()
      if (behaviour === 'ok') {
        push(`OK ${command}\r\n`)
      } else if (behaviour === 'wrong') {
        push(`ERR UNKNOWN ${command}\r\n`)
      }
    },
    async close() {},
    releaseLock() {},
  }

  const port: SerialPortLike = {
    async open(openOptions) {
      baudRates.push(openOptions.baudRate)
    },
    async close() {
      closeCalls++
    },
    getInfo: () => ({ usbVendorId: 0x2886, usbProductId: 0x802d }),
    readable: { getReader: () => reader },
    writable: { getWriter: () => writer },
    addEventListener(type, listener) {
      if (type === 'disconnect') disconnectListeners.push(listener)
    },
    removeEventListener(type, listener) {
      if (type === 'disconnect') {
        const index = disconnectListeners.indexOf(listener)
        if (index !== -1) disconnectListeners.splice(index, 1)
      }
    },
  }

  return {
    port,
    written,
    baudRates,
    closeCalls: () => closeCalls,
    triggerDisconnect() {
      for (const listener of [...disconnectListeners]) listener()
    },
  }
}

// connect() venter 300 ms efter porten er åbnet, så timerne skal køre.
async function connectLamp(lamp: SerialLamp): Promise<void> {
  const connecting = lamp.connect()
  const settled = connecting.then(
    () => undefined,
    () => undefined,
  )
  await vi.advanceTimersByTimeAsync(300)
  await settled
  await connecting
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0)
}

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'serial')
})

describe('SerialLamp', () => {
  it('åbner porten ved 115200 og sætter lampen eksplicit slukket ved forbindelsen', async () => {
    vi.useFakeTimers()
    const { port, written, baudRates } = createFakeBoard()
    const lamp = new SerialLamp(port)

    await connectLamp(lamp)

    expect(lamp.getConnectionStatus()).toBe('connected')
    expect(baudRates).toEqual([115200])
    expect(written).toEqual(['OFF\n'])
  })

  it('sætter lampen tændt ved forbindelsen, hvis kassen allerede viser en fejl', async () => {
    vi.useFakeTimers()
    const { port, written } = createFakeBoard()
    const lamp = new SerialLamp(port)
    lamp.show('red', 'blink')

    await connectLamp(lamp)

    expect(written).toEqual(['ON\n'])
  })

  it('ignorerer READY fra boardet under opstart', async () => {
    vi.useFakeTimers()
    const { port } = createFakeBoard({ sendReadyAtOpen: true })
    const lamp = new SerialLamp(port)

    await connectLamp(lamp)

    expect(lamp.getConnectionStatus()).toBe('connected')
  })

  it('oversætter enhver farve/mønster til ON og slukket til OFF, og sender kun ved ændringer', async () => {
    vi.useFakeTimers()
    const { port, written } = createFakeBoard()
    const lamp = new SerialLamp(port)
    await connectLamp(lamp)
    written.length = 0

    lamp.show('red', 'steady')
    await flush()
    lamp.show('red', 'steady') // samme tilstand igen
    lamp.show('blue', 'blink') // stadig tændt
    await flush()
    lamp.off()
    await flush()
    lamp.off()
    await flush()
    lamp.show('yellow', 'fast')
    await flush()

    expect(written).toEqual(['ON\n', 'OFF\n', 'ON\n'])
  })

  it('samler hurtige skift til den seneste ønskede tilstand', async () => {
    vi.useFakeTimers()
    const { port, written } = createFakeBoard()
    const lamp = new SerialLamp(port)
    await connectLamp(lamp)
    written.length = 0

    lamp.show('red', 'steady')
    lamp.off()
    lamp.show('red', 'steady')
    await flush()
    await flush()

    expect(written[written.length - 1]).toBe('ON\n')
  })

  it('sender ikke gentagne kommandoer uden ændringer (ingen keep-alive)', async () => {
    vi.useFakeTimers()
    const { port, written } = createFakeBoard()
    const lamp = new SerialLamp(port)
    await connectLamp(lamp)
    lamp.show('red', 'steady')
    await flush()
    written.length = 0

    await vi.advanceTimersByTimeAsync(30_000)

    expect(written).toEqual([])
  })

  it('kaster en tydelig fejl og lukker porten, hvis boardet ikke svarer', async () => {
    vi.useFakeTimers()
    const board = createFakeBoard({ behaviour: 'silent' })
    const lamp = new SerialLamp(board.port)

    const connecting = lamp.connect()
    const assertion = expect(connecting).rejects.toThrow(/svarede ikke/)
    await vi.advanceTimersByTimeAsync(300 + 1000)
    await assertion

    expect(board.closeCalls()).toBeGreaterThan(0)
    expect(lamp.getConnectionStatus()).toBe('disconnected')
  })

  it('afviser et uventet svar som en fejl', async () => {
    vi.useFakeTimers()
    const { port } = createFakeBoard({ behaviour: 'wrong' })
    const lamp = new SerialLamp(port)

    const connecting = lamp.connect()
    const assertion = expect(connecting).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(300)
    await assertion

    expect(lamp.getConnectionStatus()).toBe('disconnected')
  })

  it('sender OFF ved pagehide og beforeunload, hvis der er forbindelse', async () => {
    vi.useFakeTimers()
    const { port, written } = createFakeBoard()
    const lamp = new SerialLamp(port)
    await connectLamp(lamp)
    lamp.show('red', 'steady')
    await flush()
    written.length = 0

    window.dispatchEvent(new Event('pagehide'))
    expect(written).toEqual(['OFF\n'])

    written.length = 0
    window.dispatchEvent(new Event('beforeunload'))
    expect(written).toEqual(['OFF\n'])
  })

  it('melder "connection-lost" til lyttere, når porten sender disconnect', async () => {
    vi.useFakeTimers()
    const { port, triggerDisconnect } = createFakeBoard()
    const lamp = new SerialLamp(port)
    await connectLamp(lamp)

    const statuses: string[] = []
    lamp.subscribeConnectionStatus((status) => statuses.push(status))

    triggerDisconnect()

    expect(lamp.getConnectionStatus()).toBe('connection-lost')
    expect(statuses).toEqual(['connection-lost'])
  })

  it('forbinder automatisk igen og sætter lampen eksplicit, når boardet dukker op igen', async () => {
    vi.useFakeTimers()
    const board = createFakeBoard()
    Object.defineProperty(navigator, 'serial', {
      configurable: true,
      value: { getPorts: async () => [board.port], requestPort: async () => board.port },
    })
    const lamp = new SerialLamp(board.port)
    await connectLamp(lamp)
    lamp.show('red', 'steady')
    await flush()

    board.triggerDisconnect()
    expect(lamp.getConnectionStatus()).toBe('connection-lost')
    board.written.length = 0

    await vi.advanceTimersByTimeAsync(1000 + 300)
    await flush()

    expect(lamp.getConnectionStatus()).toBe('connected')
    expect(board.written).toEqual(['ON\n'])
  })

  it('forbinder ikke automatisk, når der er flere relæ-boards', async () => {
    vi.useFakeTimers()
    const first = createFakeBoard()
    const second = createFakeBoard()
    Object.defineProperty(navigator, 'serial', {
      configurable: true,
      value: { getPorts: async () => [first.port, second.port] },
    })
    const lamp = new SerialLamp(null)

    await lamp.tryReconnect()
    await vi.advanceTimersByTimeAsync(500)

    expect(lamp.getConnectionStatus()).toBe('disconnected')
    expect(first.written).toEqual([])
    expect(second.written).toEqual([])
  })

  it('melder "connection-lost", hvis boardet holder op med at svare på en kommando', async () => {
    vi.useFakeTimers()
    const board = createFakeBoard()
    const lamp = new SerialLamp(board.port)
    await connectLamp(lamp)

    // Boardet "hænger": ingen svar på næste kommando.
    const silent = createFakeBoard({ behaviour: 'silent' })
    board.port.writable!.getWriter().write = silent.port.writable!.getWriter().write
    lamp.show('red', 'steady')
    await vi.advanceTimersByTimeAsync(1000)

    expect(lamp.getConnectionStatus()).toBe('connection-lost')
  })
})
