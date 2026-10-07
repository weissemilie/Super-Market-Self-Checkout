/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { createEmptyData } from './posthusReducer'
import { loadPosthusData, savePosthusData } from './posthusStorage'

function scanCode(code: string) {
  for (const char of code) {
    fireEvent.keyDown(window, { key: char })
  }
  fireEvent.keyDown(window, { key: 'Enter' })
}

beforeEach(() => {
  window.history.pushState({}, '', '/?afdeling=posthus')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('Posthus i App', () => {
  it('viser posthuset og titlen i topbjælken', () => {
    render(<App />)
    expect(screen.getByText('Super Super Market · Posthus')).toBeTruthy()
    expect(screen.getByText('Indlevering')).toBeTruthy()
    expect(screen.getByText('Udlevering')).toBeTruthy()
  })

  it('indleverer en pakke uden at vise hylde, og gemmer den i localStorage', () => {
    render(<App />)
    scanCode('PAKKE001')
    expect(screen.getByText('Pakken er modtaget')).toBeTruthy()
    expect(loadPosthusData().parcels.PAKKE001.status).toBe('i biksen')
  })

  it('viser ikke pakkenummeret på sedlen under udlevering', () => {
    const data = createEmptyData()
    data.parcels.PAKKE003 = {
      code: 'PAKKE003',
      status: 'i biksen',
      registeredAt: 1000,
      deliveredAt: null,
    }
    savePosthusData(data)
    render(<App />)
    // Pakken står i oversigten; sedlen må kun vise sit eget nummer i hovedvisningen.
    scanCode('SEDDEL003')
    expect(screen.getByText('SEDDEL003')).toBeTruthy()
    expect(screen.getByText('Pakken er hjemme. Find pakken og scan dens label')).toBeTruthy()
    expect(screen.getAllByText('PAKKE003')).toHaveLength(1) // kun i oversigten
  })

  it('MESTER åbner instruktørpanelet med posthussektioner', () => {
    render(<App />)
    scanCode('MESTER')
    expect(screen.getByText('Registrer 10 tilfældige pakker')).toBeTruthy()
    expect(screen.getByText('Nulstil posthus')).toBeTruthy()
  })

  it('afdeling uden posthus viser kassen', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.getByText('Scan din første vare for at starte')).toBeTruthy()
  })
})
