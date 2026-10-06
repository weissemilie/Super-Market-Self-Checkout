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
