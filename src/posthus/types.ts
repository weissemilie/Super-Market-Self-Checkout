// Statusser for en pakke. Nye statusser (fx "spærret" og "forsvundet")
// tilføjes her og i STATUS_LABELS/STATUS_SORT_ORDER i parcelStatus.ts. Compileren
// peger på de steder i koden, der skal tage stilling til dem.
export type ParcelStatus = 'ikke ankommet' | 'i biksen' | 'udleveret'

export interface Parcel {
  code: string
  status: ParcelStatus
  registeredAt: number | null
  deliveredAt: number | null
}

export interface PosthusStats {
  // Antal indleveringer. En udleveret pakke kan indleveres igen og tælles hver gang.
  checkIns: number
  wrongParcels: number
  // Tid fra seddel scannet til pakke udleveret, i millisekunder.
  deliveryTimesMs: number[]
}

// Det der bliver gemt i localStorage. Skærmtilstand gemmes ikke.
export interface PosthusData {
  parcels: Record<string, Parcel>
  stats: PosthusStats
}

// Hvad skærmen viser lige nu. "idle" viser startskærmen.
export type PosthusActivity =
  | { kind: 'idle' }
  | { kind: 'received'; parcelCode: string; until: number }
  | { kind: 'duplicate'; parcelCode: string; until: number }
  | { kind: 'unknown'; code: string; until: number }
  | {
      kind: 'pickup'
      slipCode: string
      parcelCode: string
      startedAt: number
      // Sat når en forkert pakke er scannet; fejlen vises til tidspunktet.
      wrongUntil: number | null
    }
  | { kind: 'notArrived'; slipCode: string; until: number }
  | { kind: 'alreadyDelivered'; slipCode: string; deliveredAt: number; until: number }
  | { kind: 'delivered'; parcelCode: string; deliveredAt: number; until: number }

export interface PosthusState extends PosthusData {
  activity: PosthusActivity
  adminOpen: boolean
}

export type PosthusAction =
  | { type: 'SCAN'; code: string; now: number }
  | { type: 'TICK'; now: number }
  | { type: 'CANCEL' }
  | { type: 'RESET' }
  | { type: 'OPEN_ADMIN' }
  | { type: 'CLOSE_ADMIN' }
