import { useEffect, useState, type ReactNode } from 'react'
import { CartLogo } from '../CartLogo'
import { MockLampView } from '../lamp/MockLampView'
import styles from './TopBar.module.css'

function formatClock(date: Date): string {
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

interface TopBarProps {
  // Afdelinger med eget navn og logo, fx PostSyd. Standard er kassen.
  title?: string
  logo?: ReactNode
  // Afdelinger uden lampe (PostSyd) skjuler den.
  showLamp?: boolean
}

export function TopBar({ title = 'Super Super Market', logo, showLamp = true }: TopBarProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        {logo ?? <CartLogo className={styles.cartIcon} />}
        <span className={styles.name}>{title}</span>
      </div>
      <div className={styles.rightGroup}>
        {showLamp && <MockLampView />}
        <span className={styles.clock}>{formatClock(now)}</span>
      </div>
    </header>
  )
}
