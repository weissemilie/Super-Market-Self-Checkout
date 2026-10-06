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

export interface ErrorHistoryEntry {
  errorCode: string
  solveTimeMs: number
  wrongCards: number
}

export interface CheckoutStats {
  itemsScanned: number
  errorsSolved: number
  wrongCards: number
  solveTimesMs: number[]
  history: ErrorHistoryEntry[]
}

export interface ActiveErrorState {
  activeError: ErrorDefinition
  progress: number
  resumeMode: 'SHOPPING' | 'PAYING'
  errorStartedAt: number
  penaltyUntil: number | null
  // Tælles pr. fejl (nulstilles aldrig undervejs), så den rigtige værdi kan
  // gemmes i stats.history når fejlen løses.
  wrongCardsThisError: number
  // Sat når det sidste kort i rækkefølgen er scannet rigtigt. Kassen bliver
  // stående i ERROR lidt endnu, så "Problemet er løst" kan nå at blive set.
  resolvedAt: number | null
}

export interface Receipt {
  items: CartItem[]
  totalDkk: number
}

export type FlashKind = 'success' | 'error' | 'info'

export interface FlashMessage {
  text: string
  kind: FlashKind
  expiresAt: number
}

export interface CheckoutState {
  mode: CheckoutMode
  cart: CartItem[]
  settings: CheckoutSettings
  stats: CheckoutStats
  error: ActiveErrorState | null
  doneAt: number | null
  lastReceipt: Receipt | null
  lastErrorSolvedAt: number | null
  flash: FlashMessage | null
  adminOpen: boolean
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
  | { type: 'OPEN_ADMIN' }
  | { type: 'CLOSE_ADMIN' }
