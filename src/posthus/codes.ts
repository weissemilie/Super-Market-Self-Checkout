export const PARCEL_COUNT = 40

const CODE_PATTERN = /^(PAKKE|SEDDEL)(\d{3})$/

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

// Returnerer null for alt der ikke er PAKKE001-040 eller SEDDEL001-040.
// En seddel hører til pakken med samme nummer.
export function parseCode(code: string): ParsedCode | null {
  const match = CODE_PATTERN.exec(code)
  if (!match) {
    return null
  }
  const number = Number(match[2])
  if (number < 1 || number > PARCEL_COUNT) {
    return null
  }
  return match[1] === 'PAKKE'
    ? { kind: 'parcel', code }
    : { kind: 'slip', code, parcelCode: parcelCodeFor(number) }
}
