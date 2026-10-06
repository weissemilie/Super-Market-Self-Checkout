import { findError, findProduct, findStaffCard } from '../data'
import type { StaffCard } from '../data'
import type {
  CartItem,
  CheckoutAction,
  CheckoutSettings,
  CheckoutState,
  ScanRolls,
} from './types'

export const DONE_DURATION_MS = 8000
export const PENALTY_DURATION_MS = 10000
export const UNKNOWN_PRICE_MIN_DKK = 10
export const UNKNOWN_PRICE_MAX_DKK = 50
export const UNKNOWN_PRODUCT_NAME = 'Ukendt vare'

export const DEFAULT_SETTINGS: CheckoutSettings = {
  unknownProductMode: 'accept',
  unknownErrorChance: 0.2,
}

export function createInitialState(
  settings: CheckoutSettings = DEFAULT_SETTINGS,
): CheckoutState {
  return {
    mode: 'IDLE',
    cart: [],
    settings,
    stats: {
      itemsScanned: 0,
      errorsSolved: 0,
      wrongCards: 0,
      solveTimesMs: [],
    },
    error: null,
    doneAt: null,
    lastReceipt: null,
  }
}

export const initialCheckoutState: CheckoutState = createInitialState()

// Danske priser ender typisk på ,95 eller ,00. Her er de to bygget op som en
// liste af gyldige prispunkter fra UNKNOWN_PRICE_MIN_DKK til
// UNKNOWN_PRICE_MAX_DKK, fx 10,00, 10,95, 11,00, 11,95, ..., 50,00.
export const UNKNOWN_PRICE_STEPS: number[] = (() => {
  const steps: number[] = []
  for (let whole = UNKNOWN_PRICE_MIN_DKK; whole <= UNKNOWN_PRICE_MAX_DKK; whole++) {
    steps.push(whole)
    if (whole < UNKNOWN_PRICE_MAX_DKK) {
      steps.push(whole + 0.95)
    }
  }
  return steps
})()

export function priceFromRoll(roll: number): number {
  const index = Math.min(
    UNKNOWN_PRICE_STEPS.length - 1,
    Math.floor(roll * UNKNOWN_PRICE_STEPS.length),
  )
  return UNKNOWN_PRICE_STEPS[index]
}

function addToCart(cart: CartItem[], item: Omit<CartItem, 'quantity'>): CartItem[] {
  const index = cart.findIndex((cartItem) => cartItem.barcode === item.barcode)
  if (index === -1) {
    return [...cart, { ...item, quantity: 1 }]
  }
  return cart.map((cartItem, i) =>
    i === index ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
  )
}

function enterError(
  state: CheckoutState,
  errorCode: string,
  now: number,
  resumeMode: 'SHOPPING' | 'PAYING',
): CheckoutState {
  const activeError = findError(errorCode)
  if (!activeError) {
    return state
  }
  return {
    ...state,
    mode: 'ERROR',
    error: {
      activeError,
      progress: 0,
      resumeMode,
      errorStartedAt: now,
      penaltyUntil: null,
    },
  }
}

function handleProductScan(
  state: CheckoutState,
  code: string,
  now: number,
  rolls: ScanRolls,
): CheckoutState {
  if (state.mode === 'ERROR' || state.mode === 'PAYING' || state.mode === 'DONE') {
    return state
  }

  const product = findProduct(code)

  if (!product) {
    // Terningen for E02 rulles ved hver scanning, også for en kode der
    // tidligere er accepteret - kun prisen huskes pr. kode, ikke udfaldet.
    if (
      state.settings.unknownProductMode === 'error' ||
      rolls.error < state.settings.unknownErrorChance
    ) {
      return enterError({ ...state, mode: 'SHOPPING' }, 'E02', now, 'SHOPPING')
    }

    const cart = addToCart(state.cart, {
      barcode: code,
      name: UNKNOWN_PRODUCT_NAME,
      priceDkk: priceFromRoll(rolls.price),
    })
    return {
      ...state,
      mode: 'SHOPPING',
      cart,
      stats: { ...state.stats, itemsScanned: state.stats.itemsScanned + 1 },
    }
  }

  const cart = addToCart(state.cart, {
    barcode: product.barcode,
    name: product.name,
    priceDkk: product.priceDkk,
  })
  const nextState: CheckoutState = {
    ...state,
    mode: 'SHOPPING',
    cart,
    stats: { ...state.stats, itemsScanned: state.stats.itemsScanned + 1 },
  }

  if (product.ageRestricted) {
    return enterError(nextState, 'E03', now, 'SHOPPING')
  }

  return nextState
}

function handleStaffCardScan(
  state: CheckoutState,
  card: StaffCard,
  now: number,
): CheckoutState {
  if (state.mode !== 'ERROR' || !state.error) {
    return state
  }

  const { error } = state

  if (error.penaltyUntil !== null && now < error.penaltyUntil) {
    return state
  }

  const expectedCode = error.activeError.solution[error.progress]

  if (card.code === expectedCode) {
    const progress = error.progress + 1

    if (progress >= error.activeError.solution.length) {
      const solveTimeMs = now - error.errorStartedAt
      return {
        ...state,
        mode: error.resumeMode,
        error: null,
        stats: {
          ...state.stats,
          errorsSolved: state.stats.errorsSolved + 1,
          solveTimesMs: [...state.stats.solveTimesMs, solveTimeMs],
        },
      }
    }

    return {
      ...state,
      error: { ...error, progress },
    }
  }

  return {
    ...state,
    stats: { ...state.stats, wrongCards: state.stats.wrongCards + 1 },
    error: { ...error, progress: 0, penaltyUntil: now + PENALTY_DURATION_MS },
  }
}

export function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction,
): CheckoutState {
  switch (action.type) {
    case 'SCAN': {
      const { code, now, rolls } = action

      if (code === 'MESTER') {
        return state
      }

      if (/^\d{13}$/.test(code)) {
        return handleProductScan(state, code, now, rolls)
      }

      const staffCard = findStaffCard(code)
      if (staffCard) {
        return handleStaffCardScan(state, staffCard, now)
      }

      return state
    }

    case 'TRIGGER_ERROR': {
      if (state.mode !== 'SHOPPING' && state.mode !== 'PAYING') {
        return state
      }
      return enterError(state, action.errorCode, action.now, state.mode)
    }

    case 'START_PAYMENT': {
      if (state.mode !== 'SHOPPING') {
        return state
      }
      return { ...state, mode: 'PAYING' }
    }

    case 'PAYMENT_DONE': {
      if (state.mode !== 'PAYING') {
        return state
      }
      const totalDkk = state.cart.reduce(
        (sum, item) => sum + item.priceDkk * item.quantity,
        0,
      )
      return {
        ...state,
        mode: 'DONE',
        cart: [],
        doneAt: action.now,
        lastReceipt: { items: state.cart, totalDkk },
      }
    }

    case 'RESET': {
      return createInitialState(state.settings)
    }

    case 'SET_SETTINGS': {
      return { ...state, settings: { ...state.settings, ...action.settings } }
    }

    case 'TICK': {
      if (
        state.mode === 'DONE' &&
        state.doneAt !== null &&
        action.now - state.doneAt >= DONE_DURATION_MS
      ) {
        return { ...state, mode: 'IDLE', doneAt: null, lastReceipt: null }
      }
      return state
    }

    default:
      return state
  }
}
