export const PARCEL_COUNT = 40

const CODE_PATTERN = /^(PAKKE|SEDDEL)(\d{3})$/
const EAN_PATTERN = /^\d{13}$/

// De printede stregkoder er EAN-13: 12 datacifre og et kontrolciffer.
// Pakke n: 570200000nnn + kontrolciffer. Seddel n: 570300000nnn + kontrolciffer.
const PARCEL_EAN_PREFIX = '570200000'
const SLIP_EAN_PREFIX = '570300000'

export type ParsedCode =
  | { kind: 'parcel'; code: string }
  | { kind: 'slip'; code: string; parcelCode: string }

function padded(number: number): string {
  return String(number).padStart(3, '0')
}

export function parcelCodeFor(number: number): string {
  return `PAKKE${padded(number)}`
}

export function slipCodeFor(number: number): string {
  return `SEDDEL${padded(number)}`
}

export function allParcelCodes(): string[] {
  return Array.from({ length: PARCEL_COUNT }, (_, index) => parcelCodeFor(index + 1))
}

function eanCheckDigit(first12: string): number {
  const sum = [...first12].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
    0,
  )
  return (10 - (sum % 10)) % 10
}

function eanFor(prefix: string, number: number): string {
  const first12 = `${prefix}${padded(number)}`
  return `${first12}${eanCheckDigit(first12)}`
}

export function parcelEanFor(number: number): string {
  return eanFor(PARCEL_EAN_PREFIX, number)
}

export function slipEanFor(number: number): string {
  return eanFor(SLIP_EAN_PREFIX, number)
}

function codeFor(kind: 'parcel' | 'slip', number: number): ParsedCode {
  return kind === 'parcel'
    ? { kind, code: parcelCodeFor(number) }
    : { kind, code: slipCodeFor(number), parcelCode: parcelCodeFor(number) }
}

// Oversætter en EAN-13 stregkode til pakke eller seddel, eller null hvis
// kontrolcifret er forkert eller nummeret ikke er 1-40.
function parseEan(code: string): ParsedCode | null {
  const number = Number(code.slice(9, 12))
  if (number < 1 || number > PARCEL_COUNT) {
    return null
  }
  if (code === parcelEanFor(number)) {
    return codeFor('parcel', number)
  }
  if (code === slipEanFor(number)) {
    return codeFor('slip', number)
  }
  return null
}

// Tager både de printede EAN-13 stregkoder og tekstkoderne PAKKE001/SEDDEL001
// (til debugpanelet). Returnerer altid den interne tekstkode, eller null for
// alt der ikke er pakke 1-40 eller seddel 1-40. En seddel hører til pakken
// med samme nummer.
export function parseCode(code: string): ParsedCode | null {
  if (EAN_PATTERN.test(code)) {
    return parseEan(code)
  }
  const match = CODE_PATTERN.exec(code)
  if (!match) {
    return null
  }
  const number = Number(match[2])
  if (number < 1 || number > PARCEL_COUNT) {
    return null
  }
  return codeFor(match[1] === 'PAKKE' ? 'parcel' : 'slip', number)
}
