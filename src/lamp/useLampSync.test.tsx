/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../checkout/checkoutReducer'
import type { CheckoutState } from '../checkout/types'
import { LampContext } from './LampContext'
import type { LampConnectionStatus, LampController } from './LampController'
import { useLampSync } from './useLampSync'

interface StubLamp extends LampController {
  connectionListeners: Set<(status: LampConnectionStatus) => void>
}

function createStubLamp(): StubLamp {
  const connectionListeners = new Set<(status: LampConnectionStatus) => void>()
  return {
    connectionListeners,
    connect: vi.fn().mockResolvedValue(undefined),
    getConnectionStatus: vi.fn().mockReturnValue('connected'),
    subscribeConnectionStatus: vi.fn((listener: (status: LampConnectionStatus) => void) => {
      connectionListeners.add(listener)
      return () => connectionListeners.delete(listener)
    }),
    show: vi.fn(),
    off: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
  }
}

function renderWithLamp(lamp: LampController, initialState: CheckoutState) {
  return renderHook(({ state }: { state: CheckoutState }) => useLampSync(state), {
    initialProps: { state: initialState },
    wrapper: ({ children }) => (
      <LampContext.Provider value={lamp}>{children}</LampContext.Provider>
    ),
  })
}

describe('useLampSync', () => {
  it('sender lampens tilstand igen, når instruktørpanelet lukkes, selv hvis den beregnede tilstand er uændret', () => {
    const lamp = createStubLamp()
    const initialState: CheckoutState = { ...createInitialState(), adminOpen: true }

    const { rerender } = renderWithLamp(lamp, initialState)

    // Mode er IDLE, så den beregnede tilstand er off - sendt én gang ved
    // den første synkronisering.
    expect(lamp.off).toHaveBeenCalledTimes(1)

    // Simulerer instruktørpanelets testknap "Test rød", som sender direkte
    // til lampen og forbi useLampSync.
    lamp.show('red', 'steady')

    // Panelet lukkes. Den beregnede tilstand er stadig off (mode er stadig
    // IDLE), men skal sendes igen, så lampen ikke bliver hængende på rød.
    rerender({ state: { ...initialState, adminOpen: false } })

    expect(lamp.off).toHaveBeenCalledTimes(2)
  })

  it('sender lampens tilstand igen, når forbindelsen til Arduinoen genoprettes', () => {
    const lamp = createStubLamp()
    const initialState = createInitialState()

    renderWithLamp(lamp, initialState)

    expect(lamp.off).toHaveBeenCalledTimes(1)

    // Testknapperne har sendt noget andet direkte til lampen.
    lamp.show('blue', 'fast')

    // Forbindelsen til Arduinoen (gen)oprettes.
    for (const listener of lamp.connectionListeners) {
      listener('connected')
    }

    expect(lamp.off).toHaveBeenCalledTimes(2)
  })

  it('sender ikke tilstanden igen ved almindelige re-renders uden ændring', () => {
    const lamp = createStubLamp()
    const initialState = createInitialState()

    const { rerender } = renderWithLamp(lamp, initialState)
    expect(lamp.off).toHaveBeenCalledTimes(1)

    // En urelateret ændring af state (men stadig samme beregnede lampe-
    // tilstand, og adminOpen skifter ikke) må ikke sende off() igen.
    rerender({ state: { ...initialState, stats: { ...initialState.stats } } })

    expect(lamp.off).toHaveBeenCalledTimes(1)
  })
})
