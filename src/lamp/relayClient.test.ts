import { afterEach, describe, expect, it, vi } from 'vitest'
import { RelayClient } from './relayClient'

// Falsk port: svar lægges i en kø, og læsninger venter, indtil der er data.
function createFakeDevice() {
  const written: string[] = []
  const queue: Uint8Array[] = []
  let pending: ((result: { value?: Uint8Array; done: boolean }) => void) | null = null

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

  const reader = {
    read: () =>
      new Promise<{ value?: Uint8Array; done: boolean }>((resolve) => {
        const queued = queue.shift()
        if (queued) {
          resolve({ value: queued, done: false })
        } else {
          pending = resolve
        }
      }),
  }
  const writer = {
    async write(data: Uint8Array) {
      written.push(new TextDecoder().decode(data))
    },
  }
  return { reader, writer, written, push }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('RelayClient', () => {
  it('sender kommandoen med newline og returnerer svarlinjen', async () => {
    const device = createFakeDevice()
    device.push('OK ON\r\n')
    const client = new RelayClient(device.writer, device.reader)

    expect(await client.command('ON')).toBe('OK ON')
    expect(device.written).toEqual(['ON\n'])
  })

  it('ignorerer READY før det rigtige svar', async () => {
    const device = createFakeDevice()
    device.push('READY\r\nOK OFF\r\n')
    const client = new RelayClient(device.writer, device.reader)

    expect(await client.command('OFF')).toBe('OK OFF')
  })

  it('samler et svar, der kommer i flere dele', async () => {
    const device = createFakeDevice()
    const client = new RelayClient(device.writer, device.reader)
    const reply = client.command('STATUS')
    device.push('STATE ')
    device.push('ON\r\n')

    expect(await reply).toBe('STATE ON')
  })

  it('giver en fejl, hvis der ikke kommer svar inden for tidsfristen', async () => {
    vi.useFakeTimers()
    const device = createFakeDevice()
    const client = new RelayClient(device.writer, device.reader, 1000)

    const assertion = expect(client.command('ON')).rejects.toThrow(/svarede ikke/)
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it('mister ikke data, når et svar først kommer efter en timeout', async () => {
    vi.useFakeTimers()
    const device = createFakeDevice()
    const client = new RelayClient(device.writer, device.reader, 1000)

    const first = expect(client.command('ON')).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(1000)
    await first

    device.push('OK ON\r\n')
    expect(await client.command('ON')).toBe('OK ON')
  })
})
