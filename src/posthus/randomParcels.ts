import type { Parcel } from './types'

// Vælger op til `count` pakker, der endnu ikke er ankommet. Tilfældigheden
// sendes ind, så funktionen kan testes.
export function pickRandomUnregistered(
  parcels: Record<string, Parcel>,
  count: number,
  random: () => number,
): string[] {
  const pool = Object.values(parcels)
    .filter((parcel) => parcel.status === 'ikke ankommet')
    .map((parcel) => parcel.code)

  const picked: string[] = []
  while (picked.length < count && pool.length > 0) {
    const index = Math.min(Math.floor(random() * pool.length), pool.length - 1)
    picked.push(pool.splice(index, 1)[0])
  }
  return picked
}
