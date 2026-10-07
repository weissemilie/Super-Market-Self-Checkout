import { describe, expect, it } from 'vitest'
import { errors, products, staffCards, validateData } from './index'
import type { ErrorDefinition, Product, StaffCard } from './types'

const personale: StaffCard = {
  code: 'KORT01',
  label: 'Personale',
  role: 'personale',
  isDecoy: false,
}

const lokkekort: StaffCard = {
  code: 'KORT11',
  label: 'Annuller køb',
  role: 'lokkekort',
  isDecoy: true,
}

function makeError(solution: string[]): ErrorDefinition {
  return {
    code: 'E99',
    title: 'Test fejl',
    message: 'En test fejl.',
    lampColor: 'yellow',
    solution,
    hint: 'Test hint.',
    weight: 1,
  }
}

describe('validateData', () => {
  it('godkender de rigtige data uden at kaste', () => {
    expect(() => validateData(products, staffCards, errors)).not.toThrow()
  })

  it('kaster ved dobbelte stregkoder', () => {
    const duplicateProducts: Product[] = [
      { barcode: '5701000000001', name: 'Vare A', priceDkk: 10, ageRestricted: false },
      { barcode: '5701000000001', name: 'Vare B', priceDkk: 20, ageRestricted: false },
    ]
    expect(() => validateData(duplicateProducts, [personale], [])).toThrow(
      /stregkode/i,
    )
  })

  it('kaster hvis en løsning bruger en ukendt kortkode', () => {
    expect(() =>
      validateData(products, [personale], [makeError(['KORT99'])]),
    ).toThrow(/ukendt kortkode/i)
  })

  it('kaster hvis en løsning bruger et lokkekort', () => {
    expect(() =>
      validateData(products, [personale, lokkekort], [makeError(['KORT11'])]),
    ).toThrow(/lokkekort/i)
  })

  it('kaster ved ugyldige kortkoder', () => {
    const ugyldigtKort: StaffCard = {
      code: 'kort-01',
      label: 'Ugyldigt kort',
      role: 'personale',
      isDecoy: false,
    }
    expect(() => validateData(products, [ugyldigtKort], [])).toThrow(
      /ugyldig kortkode/i,
    )
  })

  it('kaster ved dobbelte kortkoder', () => {
    expect(() =>
      validateData(products, [personale, { ...personale }], []),
    ).toThrow(/dobbelt kortkode/i)
  })
})

// Låser fejlenes løsninger og personalekortene fast til nøglearket, så en
// utilsigtet ændring af data bliver fanget med det samme.
describe('nøgleark', () => {
  const EXPECTED_SOLUTIONS: Record<string, string[]> = {
    E01: ['KORT01'],
    E02: ['KORT01', 'KORT03'],
    E03: ['KORT01', 'KORT04'],
    E04: ['KORT01', 'KORT05'],
    E05: ['KORT02', 'KORT06'],
    E06: ['KORT01', 'KORT07'],
    E07: ['KORT02', 'KORT08', 'KORT01'],
    E08: ['KORT02', 'KORT09', 'KORT10'],
  }

  const EXPECTED_CARD_LABELS: Record<string, string> = {
    KORT01: 'Personale',
    KORT02: 'Tekniker',
    KORT03: 'Manuel vare',
    KORT04: 'Alder godkendt',
    KORT05: 'Vægt nulstil',
    KORT06: 'Papir skiftet',
    KORT07: 'Kupon tilsidesæt',
    KORT08: 'Genstart kasse',
    KORT09: 'Terminal genstart',
    KORT10: 'Bekræft',
    KORT11: 'Annuller køb',
    KORT12: 'Kald vagt',
  }

  it('har præcis de fejlkoder nøglearket kender', () => {
    expect(errors.map((error) => error.code).sort()).toEqual(
      Object.keys(EXPECTED_SOLUTIONS).sort(),
    )
  })

  it('fejlenes løsninger matcher nøglearket præcist', () => {
    for (const [code, solution] of Object.entries(EXPECTED_SOLUTIONS)) {
      const error = errors.find((candidate) => candidate.code === code)
      expect(error, `Fejl ${code} findes ikke`).toBeDefined()
      expect(error?.solution).toEqual(solution)
    }
  })

  it('staffCards.json har præcis KORT01 til KORT12 og MESTER', () => {
    const expectedCodes = [...Object.keys(EXPECTED_CARD_LABELS), 'MESTER']
    expect(staffCards.map((card) => card.code).sort()).toEqual(expectedCodes.sort())
  })

  it('KORT11 og KORT12 er lokkekort, og ingen andre kort er det', () => {
    for (const card of staffCards) {
      const shouldBeDecoy = card.code === 'KORT11' || card.code === 'KORT12'
      expect(card.isDecoy, `${card.code} (isDecoy)`).toBe(shouldBeDecoy)
    }
  })

  it('kortnavnene matcher nøglearket', () => {
    for (const [code, label] of Object.entries(EXPECTED_CARD_LABELS)) {
      const card = staffCards.find((candidate) => candidate.code === code)
      expect(card, `${code} findes ikke`).toBeDefined()
      expect(card?.label).toBe(label)
    }
  })
})
