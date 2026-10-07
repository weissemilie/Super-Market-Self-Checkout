import { useEffect, useState } from 'react'
import { CartLogo } from '../CartLogo'
import { MockLampView } from '../lamp/MockLampView'
import styles from './TopBar.module.css'

function formatClock(date: Date): string {
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

interface TopBarProps {
  department?: string
}

export function TopBar({ department }: TopBarProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <CartLogo className={styles.cartIcon} />
        <span className={styles.name}>
          {department ? `Super Super Market · ${department}` : 'Super Super Market'}
        </span>
      </div>
      <div className={styles.rightGroup}>
        <MockLampView />
        <span className={styles.clock}>{formatClock(now)}</span>
      </div>
    </header>
  )
}
