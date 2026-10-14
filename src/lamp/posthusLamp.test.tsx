/** @vitest-environment jsdom */
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createInitialState, posthusReducer } from '../posthus/posthusReducer'
import type { PosthusAction, PosthusState } from '../posthus/types'
import { LampContext } from './LampContext'
import type { LampConnectionStatus, LampController } from './LampController'
import { posthusLampStateFor } from './posthusLampState'
import { usePosthusLampSync } from './usePosthusLampSync'

const run = (state: PosthusState, ...actions: PosthusAction[]) => actions.reduce(posthusReducer, state)
const scan = (code: string, now: number): PosthusAction => ({ type: 'SCAN', code, now })
const isLit = (state: PosthusState) => posthusLampStateFor(state).color !== 'off'

describe('posthusLampStateFor', () => {
  it('er slukket på startskærmen og ved indlevering og udlevering', () => {
    const start = createInitialState()
    expect(isLit(start)).toBe(false)
    const received = run(start, scan('PAKKE001', 1000))
    expect(isLit(received)).toBe(false)
    const pickup = run(received, scan('SEDDEL001', 2000))
    expect(isLit(pickup)).toBe(false)
    expect(isLit(run(pickup, scan('PAKKE001', 3000)))).toBe(false)
  })

  it('lyser for en seddel, hvor pakken ikke er indtjekket (ikke ankommet)', () => {
    expect(isLit(run(createInitialState(), scan('SEDDEL005', 1000)))).toBe(true)
  })

  it('lyser for en seddel til en pakke, der allerede er udleveret', () => {
    const state = run(
      createInitialState(),
      scan('PAKKE001', 1000),
      scan('SEDDEL001', 2000),
      scan('PAKKE001', 3000),
      scan('SEDDEL001', 4000),
    )
    expect(isLit(state)).toBe(true)
  })

  it('lyser i 5 sekunder ved en forkert pakke og slukker så', () => {
    const state = run(
      createInitialState(),
      scan('PAKKE001', 1000),
      scan('SEDDEL001', 2000),
      scan('PAKKE002', 3000),
    )
    expect(isLit(state)).toBe(true)
    expect(isLit(posthusReducer(state, { type: 'TICK', now: 7999 }))).toBe(true)
    expect(isLit(posthusReducer(state, { type: 'TICK', now: 8000 }))).toBe(false)
  })

  it('lyser for ukendt kode og for en pakke, der allerede er i biksen', () => {
    expect(isLit(run(createInitialState(), scan('PAKKE099', 1000)))).toBe(true)
    expect(isLit(run(createInitialState(), scan('PAKKE001', 1000), scan('PAKKE001', 2000)))).toBe(true)
  })

  it('slukker, når fejlen forsvinder, eller sedlen afbrydes', () => {
    const error = run(createInitialState(), scan('SEDDEL005', 1000))
    expect(isLit(posthusReducer(error, { type: 'CANCEL' }))).toBe(false)
    expect(isLit(posthusReducer(error, { type: 'TICK', now: 7000 }))).toBe(false)
  })
})

function createStubLamp() {
  const listeners = new Set<(status: LampConnectionStatus) => void>()
  const lamp: LampController = {
    connect: vi.fn().mockResolvedValue(undefined),
    getConnectionStatus: vi.fn().mockReturnValue('connected'),
    subscribeConnectionStatus: vi.fn((l: (status: LampConnectionStatus) => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    }),
    show: vi.fn(),
    off: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}),
  }
  return { lamp, listeners }
}

describe('usePosthusLampSync', () => {
  function render(lamp: LampController, initial: PosthusState) {
    return renderHook(({ state }) => usePosthusLampSync(state), {
      initialProps: { state: initial },
      wrapper: ({ children }: { children: ReactNode }) =>
        createElement(LampContext.Provider, { value: lamp }, children),
    })
  }

  it('tænder lampen ved en fejl, slukker den bagefter og sender ikke det samme to gange', () => {
    const { lamp } = createStubLamp()
    const start = createInitialState()
    const view = render(lamp, start)
    expect(lamp.off).toHaveBeenCalledTimes(1)

    const error = run(start, scan('SEDDEL005', 1000))
    view.rerender({ state: error })
    expect(lamp.show).toHaveBeenCalledWith('red', 'steady')

    view.rerender({ state: { ...error } })
    expect(lamp.show).toHaveBeenCalledTimes(1)

    view.rerender({ state: posthusReducer(error, { type: 'CANCEL' }) })
    expect(lamp.off).toHaveBeenCalledTimes(2)
  })

  it('sender lampens tilstand igen, når forbindelsen oprettes', () => {
    const { lamp, listeners } = createStubLamp()
    render(lamp, run(createInitialState(), scan('SEDDEL005', 1000)))
    vi.mocked(lamp.show).mockClear()

    for (const listener of listeners) listener('connected')
    expect(lamp.show).toHaveBeenCalledWith('red', 'steady')
  })
})
