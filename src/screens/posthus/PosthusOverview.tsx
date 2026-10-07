import { formatTimeOfDay } from '../../format'
import {
  countByStatus,
  registeredParcelsSorted,
  STATUS_LABELS,
} from '../../posthus/parcelStatus'
import type { Parcel } from '../../posthus/types'
import styles from './PosthusOverview.module.css'

interface PosthusOverviewProps {
  parcels: Record<string, Parcel>
}

function timeOrDash(timestamp: number | null): string {
  return timestamp === null ? '–' : formatTimeOfDay(timestamp)
}

export function PosthusOverview({ parcels }: PosthusOverviewProps) {
  const sorted = registeredParcelsSorted(parcels)

  return (
    <aside className={styles.overview}>
      <div className={styles.counters}>
        <div className={styles.counter}>
          <span className={styles.counterValue}>{countByStatus(parcels, 'i biksen')}</span>
          <span className={styles.counterLabel}>I biksen</span>
        </div>
        <div className={styles.counter}>
          <span className={styles.counterValue}>{countByStatus(parcels, 'udleveret')}</span>
          <span className={styles.counterLabel}>Udleveret</span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>Ingen pakker registreret</p>
      ) : (
        <ul className={styles.list}>
          {sorted.map((parcel) => (
            <li
              key={parcel.code}
              className={`${styles.row} ${parcel.status === 'i biksen' ? styles.inBin : ''}`}
            >
              <span className={styles.code}>{parcel.code}</span>
              <span className={styles.status}>{STATUS_LABELS[parcel.status]}</span>
              <span className={styles.times}>
                Ind: {timeOrDash(parcel.registeredAt)}
                <br />
                Ud: {timeOrDash(parcel.deliveredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
