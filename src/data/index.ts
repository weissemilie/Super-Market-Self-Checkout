import errorsJson from './errors.json'
import productsJson from './products.json'
import staffCardsJson from './staffCards.json'
import type { ErrorDefinition, Product, StaffCard } from './types'

const CARD_CODE_PATTERN = /^[A-Z0-9]+$/

export function validateData(
  products: Product[],
  staffCards: StaffCard[],
  errors: ErrorDefinition[],
): void {
  const barcodes = new Set<string>()
  for (const product of products) {
    if (barcodes.has(product.barcode)) {
      throw new Error(`Dobbelt stregkode i varer: ${product.barcode}`)
    }
    barcodes.add(product.barcode)
  }

  const cardsByCode = new Map<string, StaffCard>()
  for (const card of staffCards) {
    if (!CARD_CODE_PATTERN.test(card.code)) {
      throw new Error(
        `Ugyldig kortkode "${card.code}". Kortkoder må kun bestå af A-Z og 0-9.`,
      )
    }
    if (cardsByCode.has(card.code)) {
      throw new Error(`Dobbelt kortkode: ${card.code}`)
    }
    cardsByCode.set(card.code, card)
  }

  for (const error of errors) {
    for (const code of error.solution) {
      const card = cardsByCode.get(code)
      if (!card) {
        throw new Error(`Fejl ${error.code} bruger ukendt kortkode: ${code}`)
      }
      if (card.isDecoy) {
        throw new Error(
          `Fejl ${error.code} bruger lokkekort i løsningen: ${code}`,
        )
      }
    }
  }
}

export const products = productsJson as Product[]
export const staffCards = staffCardsJson as StaffCard[]
export const errors = errorsJson as ErrorDefinition[]

validateData(products, staffCards, errors)

export function findProduct(barcode: string): Product | undefined {
  return products.find((product) => product.barcode === barcode)
}

export function findStaffCard(code: string): StaffCard | undefined {
  return staffCards.find((card) => card.code === code)
}

export function findError(code: string): ErrorDefinition | undefined {
  return errors.find((error) => error.code === code)
}

export type { ErrorDefinition, LampColor, Product, StaffCard } from './types'
