import type { Parcel, ParcelStatus } from './types'

// Pakker, der er indtjekket og står i biksen lige nu, nyeste først.
export function parcelsInBin(parcels: Record<string, Parcel>): Parcel[] {
  return Object.values(parcels)
    .filter((parcel) => parcel.status === 'i biksen')
    .sort((a, b) => (b.registeredAt ?? 0) - (a.registeredAt ?? 0))
}

export function countByStatus(
  parcels: Record<string, Parcel>,
  status: ParcelStatus,
): number {
  return Object.values(parcels).filter((parcel) => parcel.status === status).length
}

export function averageDeliveryTimeMs(deliveryTimesMs: number[]): number {
  return deliveryTimesMs.length > 0
    ? deliveryTimesMs.reduce((sum, ms) => sum + ms, 0) / deliveryTimesMs.length
    : 0
}
