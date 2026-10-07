import { afterEach, describe, expect, it, vi } from 'vitest'
import { SerialLamp } from './SerialLamp'
import type { SerialPortLike, SerialReader, SerialWriter } from './SerialLamp'

interface FakePort {
  port: SerialPortLike
  written: string[]
  triggerDisconnect: () => void
}

interface ReadResult {
  value?: Uint8Array
  done: boolean
}

// pongAfterMs: hvornår (i ms efter porten åbnes) Arduinoen "svarer" PONG.
// undefined betyder den aldrig svarer (bruges til timeout-testen).
function createFakePort(options: { pongAfterMs?: number } = {}): FakePort {
  const written: string[] = []
  const disconnectListeners: Array<() => void> = []
  const dataQueue: Uint8Array[] = []
  let pendingResolve: ((result: ReadResult) => void) | null = null

  function pushData(data: Uint8Array) {
    if (pendingResolve) {
      const resolve = pendingResolve
      pendingResolve = null
      resolve({ value: data, done: false })
    } else {
      dataQueue.push(data)
    }
  }

  if (options.pongAfterMs !== undefined) {
    setTimeout(() => {
      pushData(new TextEncoder().encode('PONG\n'))
    }, options.pongAfterMs)
  }

  const reader: SerialReader = {
    read() {
      return new Promise((resolve) => {
        const queued = dataQueue.shift()
        if (queued) {
          resolve({ value: queued, done: false })
        } else {
          pendingResolve = resolve
        }
      })
    },
    async cancel() {},
    releaseLock() {},
  }

  const writer: SerialWriter = {
    async write(data) {
      written.push(new TextDecoder().decode(data))
    },
    async close() {},
    releaseLock() {},
  }

  const port: SerialPortLike = {
    async open() {},
    async close() {},
    readable: { getReader: () => reader },
    writable: { getWriter: () => writer },
    addEventListener(type, listener) {
      if (type === 'disconnect') {
        disconnectListeners.push(listener)
      }
    },
    removeEventListener(type, listener) {
      if (type === 'disconnect') {
        const index = disconnectListeners.indexOf(listener)
        if (index !== -1) {
          disconnectListeners.splice(index, 1)
        }
      }
    },
  }

  return {
    port,
    written,
    triggerDisconnect() {
      for (const listener of disconnectListeners) {
        listener()
      }
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('SerialLamp', () => {
  it('forbinder og sender PING, når Arduinoen svarer PONG med det samme', async () => {
    const { port, written } = createFakePort({ pongAfterMs: 0 })
    const lamp = new SerialLamp(port)

    await lamp.connect()

    expect(lamp.getConnectionStatus()).toBe('connected')
    expect(written).toEqual(['PING\n'])
  })

  it('bliver ved med at sende PING hvert halve sekund og forbinder, hvis PONG først kommer efter 3 sekunder', async () => {
    vi.useFakeTimers()
    const { port, written } = createFakePort({ pongAfterMs: 3000 })
    const lamp = new SerialLamp(port)

    const connectPromise = lamp.connect()

    await vi.advanceTimersByTimeAsync(3000)
    await connectPromise

    expect(lamp.getConnectionStatus()).toBe('connected')
    const pingCount = written.filter((line) => line === 'PING\n').length
    expect(pingCount).toBeGreaterThan(1)
  })

  it('kaster en tydelig fejl og lukker porten, hvis der ikke kommer PONG inden 6 sekunder', async () => {
    vi.useFakeTimers()
    const { port } = createFakePort()
    const closeSpy = vi.spyOn(port, 'close')
    const lamp = new SerialLamp(port)

    const connectPromise = lamp.connect()
    const assertion = expect(connectPromise).rejects.toThrow(/PONG/i)

    await vi.advanceTimersByTimeAsync(6000)
    await assertion

    expect(closeSpy).toHaveBeenCalled()
    expect(lamp.getConnectionStatus()).toBe('disconnected')
  })

  it('sender kun en kommando til porten, når lampens tilstand faktisk ændrer sig', async () => {
    const { port, written } = createFakePort({ pongAfterMs: 0 })
    const lamp = new SerialLamp(port)
    await lamp.connect()
    written.length = 0 // ryd PING fra opsætningen

    lamp.show('red', 'steady')
    lamp.show('red', 'steady') // samme tilstand igen - ingen ny kommando
    lamp.show('blue', 'blink')
    lamp.off()
    lamp.off() // samme tilstand igen - ingen ny kommando

    expect(written).toEqual(['LAMP RED STEADY\n', 'LAMP BLUE BLINK\n', 'LAMP OFF\n'])
  })

  it('melder "connection-lost" til lyttere, når porten sender disconnect', async () => {
    const { port, triggerDisconnect } = createFakePort({ pongAfterMs: 0 })
    const lamp = new SerialLamp(port)
    await lamp.connect()

    const statuses: string[] = []
    lamp.subscribeConnectionStatus((status) => statuses.push(status))

    triggerDisconnect()

    expect(lamp.getConnectionStatus()).toBe('connection-lost')
    expect(statuses).toEqual(['connection-lost'])
  })
})
