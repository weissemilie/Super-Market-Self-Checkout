import { loadJson, saveJson } from '../storage'
import { createEmptyData } from './posthusReducer'
import type { Parcel } from './types'
import type { PosthusData } from './types'

const STORAGE_KEY = 'spejder-super.posthus'
const VALID_STATUSES = ['ikke ankommet', 'i biksen', 'udleveret']

function isNumberOrNull(value: unknown): boolean {
  return value === null || typeof value === 'number'
}

function isValidData(value: unknown): value is PosthusData {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const v = value as Record<string, unknown>
  const { parcels, stats } = v
  if (typeof parcels !== 'object' || parcels === null) {
    return false
  }
  if (typeof stats !== 'object' || stats === null) {
    return false
  }
  const s = stats as Record<string, unknown>
  if (
    typeof s.wrongParcels !== 'number' ||
    !Array.isArray(s.deliveryTimesMs) ||
    !s.deliveryTimesMs.every((ms) => typeof ms === 'number')
  ) {
    return false
  }
  // Alle 40 pakker skal findes med den rigtige form.
  const expectedCodes = Object.keys(createEmptyData().parcels)
  return expectedCodes.every((code) => {
    const parcel = (parcels as Record<string, unknown>)[code] as
      | Record<string, unknown>
      | undefined
    return (
      typeof parcel === 'object' &&
      parcel !== null &&
      parcel.code === code &&
      typeof parcel.status === 'string' &&
      VALID_STATUSES.includes(parcel.status) &&
      isNumberOrNull(parcel.registeredAt) &&
      isNumberOrNull(parcel.deliveredAt)
    )
  })
}

export function loadPosthusData(): PosthusData {
  const data = loadJson(STORAGE_KEY, isValidData)
  if (!data) {
    return createEmptyData()
  }
  // Data gemt før checkIns fandtes: tæl de registrerede pakker.
  if (typeof data.stats.checkIns !== 'number') {
    const registered = Object.values<Parcel>(data.parcels).filter(
      (parcel) => parcel.registeredAt !== null,
    ).length
    return { ...data, stats: { ...data.stats, checkIns: registered } }
  }
  return data
}

export function savePosthusData(data: PosthusData): void {
  saveJson(STORAGE_KEY, { parcels: data.parcels, stats: data.stats })
}
