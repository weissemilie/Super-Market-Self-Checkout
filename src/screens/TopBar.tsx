import { useEffect, useState } from 'react'
import styles from './TopBar.module.css'

function formatClock(date: Date): string {
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

export function TopBar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <svg
          className={styles.cartIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
          <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
        <span className={styles.name}>Spejder Super</span>
      </div>
      <span className={styles.clock}>{formatClock(now)}</span>
    </header>
  )
}
