/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function openAdmin() {
  fireEvent.keyDown(window, { key: 'A', ctrlKey: true, shiftKey: true })
}

describe('Instruktørpanelet på kassen', () => {
  it('Udløs nu lukker panelet og viser fejlen med det samme', () => {
    render(<App />)
    openAdmin()
    expect(screen.getByText('Instruktørpanel')).toBeTruthy()

    fireEvent.click(screen.getAllByText('Udløs nu')[0])

    expect(screen.queryByText('Instruktørpanel')).toBeNull()
    expect(screen.getByText('E01')).toBeTruthy()
    expect(screen.getByText('Uventet vare i posepladsen')).toBeTruthy()
  })

  it('har ingen links til personalekort eller fejlmanual og ingen simuleret lampe', () => {
    render(<App />)
    openAdmin()
    expect(screen.queryByText('Print personalekort')).toBeNull()
    expect(screen.queryByText('Fejlmanual')).toBeNull()
    expect(document.querySelector('a[href*=".pdf"]')).toBeNull()
  })

  it('forklarer de to valg for ukendte varer og viser, hvad der gælder lige nu', () => {
    render(<App />)
    openAdmin()
    expect(screen.getByText('Tag varen med')).toBeTruthy()
    expect(screen.getByText('Giv altid fejl')).toBeTruthy()
    expect(screen.getByText(/Lige nu: ukendte varer tages med/)).toBeTruthy()

    fireEvent.click(screen.getByText('Giv altid fejl'))
    expect(screen.getByText('Lige nu: alle ukendte varer giver fejlen E02.')).toBeTruthy()
  })
})
