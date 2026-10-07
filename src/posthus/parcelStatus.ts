import type { Parcel, ParcelStatus } from './types'

export const STATUS_LABELS: Record<ParcelStatus, string> = {
  'ikke ankommet': 'Ikke ankommet',
  'i biksen': 'I biksen',
  udleveret: 'Udleveret',
}

// Lavest tal står øverst i oversigten.
const STATUS_SORT_ORDER: Record<ParcelStatus, number> = {
  'i biksen': 0,
  udleveret: 1,
  'ikke ankommet': 2,
}

function lastEventTime(parcel: Parcel): number {
  return parcel.deliveredAt ?? parcel.registeredAt ?? 0
}

// Registrerede pakker, med pakker i biksen øverst og nyeste først.
export function registeredParcelsSorted(parcels: Record<string, Parcel>): Parcel[] {
  return Object.values(parcels)
    .filter((parcel) => parcel.registeredAt !== null)
    .sort(
      (a, b) =>
        STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] ||
        lastEventTime(b) - lastEventTime(a),
    )
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
