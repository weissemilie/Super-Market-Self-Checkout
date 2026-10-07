import { describe, expect, it, vi } from 'vitest'
import type { LampController } from './LampController'
import { LampMux } from './LampMux'

type StubLamp = LampController & { tryReconnect: () => Promise<void> }

function createStubLamp(overrides: Partial<StubLamp> = {}): StubLamp {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    tryReconnect: vi.fn().mockResolvedValue(undefined),
    getConnectionStatus: vi.fn().mockReturnValue('connected'),
    subscribeConnectionStatus: vi.fn().mockReturnValue(() => {}),
    show: vi.fn(),
    off: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  }
}

describe('LampMux', () => {
  it('sender show og off til både mock og serial', () => {
    const mock = createStubLamp()
    const serial = createStubLamp()
    const mux = new LampMux(mock, serial)

    mux.show('red', 'blink')
    mux.off()

    expect(mock.show).toHaveBeenCalledWith('red', 'blink')
    expect(serial.show).toHaveBeenCalledWith('red', 'blink')
    expect(mock.off).toHaveBeenCalled()
    expect(serial.off).toHaveBeenCalled()
  })

  it('abonnerer på mock for den tilstand der vises på skærmen', () => {
    const mock = createStubLamp()
    const serial = createStubLamp()
    const mux = new LampMux(mock, serial)

    const listener = vi.fn()
    mux.subscribe(listener)

    expect(mock.subscribe).toHaveBeenCalledWith(listener)
  })

  it('bruger serial til forbindelsesstatus, ikke mock', () => {
    const mock = createStubLamp()
    const serial = createStubLamp({
      getConnectionStatus: vi.fn().mockReturnValue('connection-lost'),
    })
    const mux = new LampMux(mock, serial)

    expect(mux.getConnectionStatus()).toBe('connection-lost')
  })

  it('fortsætter med MockLamp alene, når SerialLamp fejler ved connect', async () => {
    const mock = createStubLamp()
    const serial = createStubLamp({
      connect: vi.fn().mockRejectedValue(new Error('Ingen PONG')),
    })
    const mux = new LampMux(mock, serial)

    await expect(mux.connect()).rejects.toThrow('Ingen PONG')
    expect(mock.connect).toHaveBeenCalled()

    // MockLamp virker stadig, selvom serial.connect() fejlede.
    mux.show('yellow', 'steady')
    expect(mock.show).toHaveBeenCalledWith('yellow', 'steady')
  })
})
