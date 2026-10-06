import { useEffect, useState } from 'react'
import { CartLogo } from '../CartLogo'
import { MockLampView } from '../lamp/MockLampView'
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
        <CartLogo className={styles.cartIcon} />
        <span className={styles.name}>Spejder Super</span>
      </div>
      <div className={styles.rightGroup}>
        <MockLampView />
        <span className={styles.clock}>{formatClock(now)}</span>
      </div>
    </header>
  )
}
