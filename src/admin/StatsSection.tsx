import type { CheckoutStats } from '../checkout/types'
import { findError } from '../data'
import styles from './AdminPanel.module.css'

interface StatsSectionProps {
  stats: CheckoutStats
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(1)
}

export function StatsSection({ stats }: StatsSectionProps) {
  const averageSolveTimeMs =
    stats.solveTimesMs.length > 0
      ? stats.solveTimesMs.reduce((sum, ms) => sum + ms, 0) / stats.solveTimesMs.length
      : 0

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Statistik</h2>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.itemsScanned}</span>
          <span className={styles.statLabel}>Antal købte varer</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.errorsSolved}</span>
          <span className={styles.statLabel}>Løste fejl</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatSeconds(averageSolveTimeMs)} s</span>
          <span className={styles.statLabel}>Gennemsnitlig løsningstid</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.wrongCards}</span>
          <span className={styles.statLabel}>Forkerte kort</span>
        </div>
      </div>

      {stats.history.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Fejlkode</th>
              <th>Titel</th>
              <th>Løsningstid</th>
              <th>Forkerte kort</th>
            </tr>
          </thead>
          <tbody>
            {stats.history
              .map((entry, index) => ({ entry, originalIndex: index }))
              .reverse()
              .map(({ entry, originalIndex }) => (
                <tr key={originalIndex}>
                  <td>{entry.errorCode}</td>
                  <td>{findError(entry.errorCode)?.title ?? '—'}</td>
                  <td>{formatSeconds(entry.solveTimeMs)} s</td>
                  <td>{entry.wrongCards}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
