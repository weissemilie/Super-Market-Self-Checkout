/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('App', () => {
  it('viser velkomstskærmen før der er scannet noget', () => {
    render(<App />)
    expect(screen.getByText('Scan din første vare for at starte')).toBeTruthy()
  })

  it('sender en simuleret scanning fra ScanDebug til samme handler som en rigtig scanning', () => {
    render(<App />)

    // Åbn ScanDebug med F2, ligesom en rigtig bruger ville gøre.
    fireEvent.keyDown(window, { key: 'F2' })

    const input = screen.getByPlaceholderText('Indtast kode og tryk Enter')
    fireEvent.change(input, { target: { value: '5701000000001' } })
    fireEvent.submit(input.closest('form')!)

    // Hvis scanningen er nået frem til checkout-reduceren, viser
    // ShoppingScreen nu varen i kurven.
    expect(screen.getByText(/Øko mælk 1 liter/)).toBeTruthy()
    expect(screen.queryByText('Scan din første vare for at starte')).toBeNull()
  })

  it('en rigtig scanner-hændelse på window scanner en vare, selv når debugpanelet er lukket', () => {
    render(<App />)

    // Panelet er lukket som udgangspunkt, og vi åbner det ikke i denne test.
    expect(screen.queryByPlaceholderText('Indtast kode og tryk Enter')).toBeNull()

    const barcode = '5701000000002' // Rugbrød
    for (const char of barcode) {
      fireEvent.keyDown(window, { key: char })
    }
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(screen.getByText(/Rugbrød/)).toBeTruthy()
  })

  it('skriver en 13 cifret kode i inputfeltet tegn for tegn, og hele koden bliver scannet', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'F2' })
    const input = screen.getByPlaceholderText('Indtast kode og tryk Enter') as HTMLInputElement

    // Stregkoden indeholder bl.a. cifrene 1, der tidligere var tastaturgenvej
    // til at skifte fejl-forudindstilling. Hvert tegn sendes som sit eget
    // keydown på selve inputfeltet, ligesom en rigtig bruger ville skrive.
    const barcode = '5701000000001'
    let typed = ''
    for (const char of barcode) {
      typed += char
      fireEvent.keyDown(input, { key: char })
      fireEvent.change(input, { target: { value: typed } })
    }

    expect(input.value).toBe(barcode)

    fireEvent.submit(input.closest('form')!)

    expect(screen.getByText(/Øko mælk 1 liter/)).toBeTruthy()
  })

  it('udløser E02 ved en ukendt vare, når fejl-rullet er lavt (Math.random mocket til 0.1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    render(<App />)

    fireEvent.keyDown(window, { key: 'F2' })
    const input = screen.getByPlaceholderText('Indtast kode og tryk Enter')
    fireEvent.change(input, { target: { value: '5701999999999' } })
    fireEvent.submit(input.closest('form')!)

    expect(screen.getByText('E02')).toBeTruthy()
    expect(screen.getByText('Varen blev ikke fundet')).toBeTruthy()
    expect(screen.getByText('Tilkald personale')).toBeTruthy()
  })
})
