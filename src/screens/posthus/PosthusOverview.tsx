import { formatTimeOfDay } from '../../format'
import { countByStatus, parcelsInBin } from '../../posthus/parcelStatus'
import type { Parcel } from '../../posthus/types'
import styles from './PosthusOverview.module.css'

interface PosthusOverviewProps {
  parcels: Record<string, Parcel>
}

export function PosthusOverview({ parcels }: PosthusOverviewProps) {
  const inBin = parcelsInBin(parcels)

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

      <h2 className={styles.listTitle}>Indtjekkede pakker</h2>

      {inBin.length === 0 ? (
        <p className={styles.empty}>Ingen pakker i biksen</p>
      ) : (
        <ul className={styles.list}>
          {inBin.map((parcel) => (
            <li key={parcel.code} className={styles.row}>
              <span className={styles.code}>{parcel.code}</span>
              <span className={styles.time}>
                {parcel.registeredAt !== null && formatTimeOfDay(parcel.registeredAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
