import { allParcelCodes, parseCode } from './codes'
import type {
  Parcel,
  PosthusAction,
  PosthusActivity,
  PosthusData,
  PosthusState,
} from './types'

const RECEIVED_VISIBLE_MS = 4000
const DUPLICATE_VISIBLE_MS = 5000
const UNKNOWN_VISIBLE_MS = 4000
const PICKUP_RESULT_VISIBLE_MS = 6000
const WRONG_PARCEL_VISIBLE_MS = 3000

const IDLE: PosthusActivity = { kind: 'idle' }

export function createEmptyData(): PosthusData {
  const parcels: Record<string, Parcel> = {}
  for (const code of allParcelCodes()) {
    parcels[code] = { code, status: 'ikke ankommet', registeredAt: null, deliveredAt: null }
  }
  return { parcels, stats: { wrongParcels: 0, deliveryTimesMs: [] } }
}

export function createInitialState(data: PosthusData = createEmptyData()): PosthusState {
  return { ...data, activity: IDLE, adminOpen: false }
}

function assertNever(value: never): never {
  throw new Error(`Uhåndteret status: ${String(value)}`)
}

function withParcel(state: PosthusState, parcel: Parcel): Record<string, Parcel> {
  return { ...state.parcels, [parcel.code]: parcel }
}

function checkInParcel(state: PosthusState, code: string, now: number): PosthusState {
  const parcel = state.parcels[code]
  if (parcel.status !== 'ikke ankommet') {
    return {
      ...state,
      activity: {
        kind: 'duplicate',
        parcelCode: code,
        status: parcel.status,
        until: now + DUPLICATE_VISIBLE_MS,
      },
    }
  }
  return {
    ...state,
    parcels: withParcel(state, { ...parcel, status: 'i biksen', registeredAt: now }),
    activity: { kind: 'received', parcelCode: code, until: now + RECEIVED_VISIBLE_MS },
  }
}

function startPickup(
  state: PosthusState,
  slipCode: string,
  parcelCode: string,
  now: number,
): PosthusState {
  const parcel = state.parcels[parcelCode]
  const until = now + PICKUP_RESULT_VISIBLE_MS

  switch (parcel.status) {
    case 'i biksen': {
      const current = state.activity
      // Scannes samme seddel igen, fortsætter udleveringen uden at nulstille tiden.
      if (current.kind === 'pickup' && current.slipCode === slipCode) {
        return state
      }
      return {
        ...state,
        activity: { kind: 'pickup', slipCode, parcelCode, startedAt: now, wrongUntil: null },
      }
    }
    case 'ikke ankommet':
      return { ...state, activity: { kind: 'notArrived', slipCode, until } }
    case 'udleveret':
      return {
        ...state,
        activity: {
          kind: 'alreadyDelivered',
          slipCode,
          deliveredAt: parcel.deliveredAt ?? now,
          until,
        },
      }
    default:
      return assertNever(parcel.status)
  }
}

function scanDuringPickup(
  state: PosthusState,
  activity: Extract<PosthusActivity, { kind: 'pickup' }>,
  code: string,
  now: number,
): PosthusState {
  if (code !== activity.parcelCode) {
    // Den forkerte pakke registreres aldrig, uanset om den findes i systemet.
    return {
      ...state,
      stats: { ...state.stats, wrongParcels: state.stats.wrongParcels + 1 },
      activity: { ...activity, wrongUntil: now + WRONG_PARCEL_VISIBLE_MS },
    }
  }
  const parcel = state.parcels[code]
  return {
    ...state,
    parcels: withParcel(state, { ...parcel, status: 'udleveret', deliveredAt: now }),
    stats: {
      ...state.stats,
      deliveryTimesMs: [...state.stats.deliveryTimesMs, now - activity.startedAt],
    },
    activity: {
      kind: 'delivered',
      parcelCode: code,
      deliveredAt: now,
      until: now + PICKUP_RESULT_VISIBLE_MS,
    },
  }
}

function scan(state: PosthusState, code: string, now: number): PosthusState {
  // MESTER åbner og lukker instruktørpanelet og tæller aldrig som en scanning.
  if (code === 'MESTER') {
    return { ...state, adminOpen: !state.adminOpen }
  }
  if (state.adminOpen) {
    return state
  }

  const parsed = parseCode(code)
  if (!parsed) {
    return {
      ...state,
      activity: { kind: 'unknown', code, until: now + UNKNOWN_VISIBLE_MS },
    }
  }
  if (parsed.kind === 'slip') {
    return startPickup(state, parsed.code, parsed.parcelCode, now)
  }
  if (state.activity.kind === 'pickup') {
    return scanDuringPickup(state, state.activity, parsed.code, now)
  }
  return checkInParcel(state, parsed.code, now)
}

function tick(state: PosthusState, now: number): PosthusState {
  const activity = state.activity
  if (activity.kind === 'idle') {
    return state
  }
  if (activity.kind === 'pickup') {
    return activity.wrongUntil !== null && now >= activity.wrongUntil
      ? { ...state, activity: { ...activity, wrongUntil: null } }
      : state
  }
  return now >= activity.until ? { ...state, activity: IDLE } : state
}

function registerParcels(state: PosthusState, codes: string[], now: number): PosthusState {
  const parcels = { ...state.parcels }
  for (const code of codes) {
    const parcel = parcels[code]
    if (parcel && parcel.status === 'ikke ankommet') {
      parcels[code] = { ...parcel, status: 'i biksen', registeredAt: now }
    }
  }
  return { ...state, parcels }
}

export function posthusReducer(state: PosthusState, action: PosthusAction): PosthusState {
  switch (action.type) {
    case 'SCAN':
      return scan(state, action.code, action.now)
    case 'TICK':
      return tick(state, action.now)
    case 'CANCEL':
      return { ...state, activity: IDLE }
    case 'REGISTER_PARCELS':
      return registerParcels(state, action.codes, action.now)
    case 'RESET':
      return { ...createInitialState(), adminOpen: state.adminOpen }
    case 'OPEN_ADMIN':
      return { ...state, adminOpen: true }
    case 'CLOSE_ADMIN':
      return { ...state, adminOpen: false }
  }
}
