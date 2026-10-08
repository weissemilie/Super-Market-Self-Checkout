/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SerialLamp } from './SerialLamp'
import type { SerialPortLike, SerialReader, SerialWriter } from './SerialLamp'

interface FakePort {
  port: SerialPortLike
  written: string[]
  signalCalls: Array<{ dataTerminalReady?: boolean; requestToSend?: boolean }>
  triggerDisconnect: () => void
}

interface ReadResult {
  value?: Uint8Array
  done: boolean
}

// pongAfterMs: hvornår (i ms efter porten åbnes) ESP32'en "svarer" PONG.
// undefined betyder den aldrig svarer (bruges til timeout-testen).
function createFakePort(options: { pongAfterMs?: number } = {}): FakePort {
  const written: string[] = []
  const signalCalls: Array<{ dataTerminalReady?: boolean; requestToSend?: boolean }> = []
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
    async setSignals(signals) {
      signalCalls.push(signals)
    },
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
    signalCalls,
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
  it('forbinder, sætter DTR/RTS false og sender PING, når ESP32 svarer PONG med det samme', async () => {
    const { port, written, signalCalls } = createFakePort({ pongAfterMs: 0 })
    const lamp = new SerialLamp(port)

    await lamp.connect()

    expect(lamp.getConnectionStatus()).toBe('connected')
    expect(written).toEqual(['PING\n'])
    expect(signalCalls).toEqual([{ dataTerminalReady: false, requestToSend: false }])
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

  it('oversætter enhver farve/mønster til ON og slukket til OFF, og sender kun når det ændrer sig', async () => {
    const { port, written } = createFakePort({ pongAfterMs: 0 })
    const lamp = new SerialLamp(port)
    await lamp.connect()
    written.length = 0 // ryd PING fra opsætningen

    lamp.show('red', 'steady')
    lamp.show('red', 'steady') // samme tilstand igen - ingen ny kommando
    lamp.show('blue', 'blink') // stadig tændt - relæet skal ikke sende ON igen
    lamp.off()
    lamp.off() // samme tilstand igen - ingen ny kommando
    lamp.show('yellow', 'fast') // tændes igen

    expect(written).toEqual(['ON\n', 'OFF\n', 'ON\n'])
  })

  it('gentager den aktuelle kommando hvert 5. sekund, så længe der er forbindelse', async () => {
    // Fake timers skal være aktive FØR connect(), da keep-alive-intervallet
    // oprettes med setInterval inde i connect() selv.
    vi.useFakeTimers()
    const { port, written } = createFakePort({ pongAfterMs: 0 })
    const lamp = new SerialLamp(port)

    const connectPromise = lamp.connect()
    await vi.advanceTimersByTimeAsync(0)
    await connectPromise

    lamp.show('red', 'steady')
    written.length = 0 // ryd PING og den første ON fra opsætningen

    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)

    expect(written).toEqual(['ON\n', 'ON\n', 'ON\n'])

    lamp.off()
    written.length = 0

    await vi.advanceTimersByTimeAsync(5000)

    expect(written).toEqual(['OFF\n'])
  })

  it('sender OFF ved pagehide og beforeunload, hvis der er forbindelse', async () => {
    const { port, written } = createFakePort({ pongAfterMs: 0 })
    const lamp = new SerialLamp(port)
    await lamp.connect()

    lamp.show('red', 'steady')
    written.length = 0

    window.dispatchEvent(new Event('pagehide'))
    expect(written).toEqual(['OFF\n'])

    lamp.show('red', 'steady')
    written.length = 0

    window.dispatchEvent(new Event('beforeunload'))
    expect(written).toEqual(['OFF\n'])
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
