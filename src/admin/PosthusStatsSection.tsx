import { averageDeliveryTimeMs } from '../posthus/parcelStatus'
import type { PosthusData } from '../posthus/types'
import styles from './AdminPanel.module.css'

const secondsFormatter = new Intl.NumberFormat('da-DK', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function PosthusStatsSection({ data }: { data: PosthusData }) {
  const averageMs = averageDeliveryTimeMs(data.stats.deliveryTimesMs)

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Statistik</h2>
      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data.stats.checkIns}</span>
          <span className={styles.statLabel}>Indleverede pakker</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data.stats.deliveryTimesMs.length}</span>
          <span className={styles.statLabel}>Udleverede pakker</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data.stats.wrongParcels}</span>
          <span className={styles.statLabel}>Forkerte pakker scannet</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {secondsFormatter.format(averageMs / 1000)} s
          </span>
          <span className={styles.statLabel}>Gennemsnitlig tid fra seddel til udlevering</span>
        </div>
      </div>
    </section>
  )
}
