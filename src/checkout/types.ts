import type { ErrorDefinition } from '../data'

export type CheckoutMode = 'IDLE' | 'SHOPPING' | 'PAYING' | 'ERROR' | 'DONE'

export interface CartItem {
  barcode: string
  name: string
  priceDkk: number
  quantity: number
}

export interface CheckoutSettings {
  unknownProductMode: 'error' | 'accept'
  unknownErrorChance: number
}

export interface CheckoutStats {
  itemsScanned: number
  errorsSolved: number
  wrongCards: number
  solveTimesMs: number[]
}

export interface ActiveErrorState {
  activeError: ErrorDefinition
  progress: number
  resumeMode: 'SHOPPING' | 'PAYING'
  errorStartedAt: number
  penaltyUntil: number | null
}

export interface Receipt {
  items: CartItem[]
  totalDkk: number
}

export interface CheckoutState {
  mode: CheckoutMode
  cart: CartItem[]
  settings: CheckoutSettings
  stats: CheckoutStats
  error: ActiveErrorState | null
  doneAt: number | null
  lastReceipt: Receipt | null
}

export interface ScanRolls {
  price: number
  error: number
}

export type CheckoutAction =
  | { type: 'SCAN'; code: string; now: number; rolls: ScanRolls }
  | { type: 'TRIGGER_ERROR'; errorCode: string; now: number }
  | { type: 'START_PAYMENT'; now: number }
  | { type: 'PAYMENT_DONE'; now: number }
  | { type: 'RESET'; now: number }
  | { type: 'SET_SETTINGS'; settings: Partial<CheckoutSettings>; now: number }
  | { type: 'TICK'; now: number }
