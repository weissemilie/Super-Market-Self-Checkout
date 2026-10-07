import styles from './PosthusStart.module.css'

export function PosthusStart() {
  return (
    <div className={styles.start}>
      <section className={styles.card}>
        <h2 className={styles.title}>Indlevering</h2>
        <p className={styles.text}>Scan labelen på pakken</p>
      </section>
      <section className={styles.card}>
        <h2 className={styles.title}>Udlevering</h2>
        <p className={styles.text}>Scan kundens afhentningsseddel</p>
      </section>
    </div>
  )
}
