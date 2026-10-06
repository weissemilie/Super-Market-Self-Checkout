export interface Product {
  barcode: string
  name: string
  priceDkk: number
  ageRestricted: boolean
}

export interface StaffCard {
  code: string
  label: string
  role: string
  isDecoy: boolean
}

export type LampColor = 'yellow' | 'red' | 'blue' | 'off'

export interface ErrorDefinition {
  code: string
  title: string
  message: string
  lampColor: LampColor
  solution: string[]
  hint: string
  weight: number
}
