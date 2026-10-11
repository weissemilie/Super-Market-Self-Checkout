/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'
import { useErrorGeneratorConfig } from './useErrorGeneratorConfig'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function scanCode(code: string) {
  for (const char of code) {
    fireEvent.keyDown(window, { key: char })
  }
  fireEvent.keyDown(window, { key: 'Enter' })
}

describe('chance for fejl efter scanning', () => {
  it('bruger sværhedsgradens chance, til instruktøren justerer den', () => {
    const { result } = renderHook(() => useErrorGeneratorConfig())
    expect(result.current.chancePerScan).toBe(0.1)

    act(() => result.current.setChancePerScan(0.6))
    expect(result.current.chancePerScan).toBe(0.6)
    expect(result.current.effectiveConfig.chancePerScan).toBe(0.6)

    // Et nyt valg af sværhedsgrad nulstiller den egne justering.
    act(() => result.current.setPreset('kaos'))
    expect(result.current.chancePerScan).toBe(0.25)
  })

  it('holder chancen mellem 0 og 100 procent', () => {
    const { result } = renderHook(() => useErrorGeneratorConfig())
    act(() => result.current.setChancePerScan(5))
    expect(result.current.chancePerScan).toBe(1)
    act(() => result.current.setChancePerScan(-1))
    expect(result.current.chancePerScan).toBe(0)
  })

  it('kaster en af de afkrydsede fejl efter en scannet vare, når chancen er 100 procent', () => {
    localStorage.setItem(
      'spejder-super.error-generator',
      JSON.stringify({
        preset: 'normal',
        enabled: true,
        enabledErrors: ['E04'],
        chancePerScan: 1,
      }),
    )
    render(<App />)

    scanCode('5701000000001') // Øko mælk, en almindelig vare

    expect(screen.getByText('E04')).toBeTruthy()
    expect(screen.getByText('Vægten passer ikke')).toBeTruthy()
  })

  it('kaster ingen fejl efter scanning, når chancen er 0 procent', () => {
    localStorage.setItem(
      'spejder-super.error-generator',
      JSON.stringify({
        preset: 'normal',
        enabled: true,
        enabledErrors: ['E04'],
        chancePerScan: 0,
      }),
    )
    render(<App />)

    scanCode('5701000000001')

    expect(screen.queryByText('E04')).toBeNull()
    expect(screen.getByText(/Øko mælk/)).toBeTruthy()
  })
})
