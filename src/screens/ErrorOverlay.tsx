import { useEffect, useState } from 'react'
import type { LampColor } from '../data'
import type { ActiveErrorState } from '../checkout/types'
import styles from './ErrorOverlay.module.css'

const COUNTDOWN_TICK_MS = 200

const LAMP_STYLES: Record<LampColor, { background: string; color: string }> = {
  yellow: { background: '#f5c518', color: '#1b1600' },
  red: { background: '#c81e2c', color: '#ffffff' },
  blue: { background: '#1d4ed8', color: '#ffffff' },
  off: { background: '#111111', color: '#ffffff' },
}

interface ErrorOverlayProps {
  error: ActiveErrorState
}

export function ErrorOverlay({ error }: ErrorOverlayProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS)
    return () => clearInterval(interval)
  }, [])

  const remainingMs = error.penaltyUntil !== null ? error.penaltyUntil - now : 0
  const isPenalty = error.penaltyUntil !== null && remainingMs > 0
  const remainingSeconds = isPenalty ? Math.ceil(remainingMs / 1000) : 0

  const lamp = LAMP_STYLES[error.activeError.lampColor]
  const solvedCount = error.progress
  const totalCount = error.activeError.solution.length

  return (
    <div
      className={styles.overlay}
      style={{ backgroundColor: lamp.background, color: lamp.color }}
    >
      <svg
        className={styles.warningIcon}
        viewBox="0 0 64 56"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M32 6 L60 50 H4 Z" />
        <line x1="32" y1="22" x2="32" y2="34" />
        <circle cx="32" cy="42" r="1.5" fill="currentColor" stroke="none" />
      </svg>

      <span className={styles.code}>{error.activeError.code}</span>
      <h1 className={styles.title}>{error.activeError.title}</h1>
      <p className={styles.message}>{error.activeError.message}</p>
      <p className={styles.callStaff}>Tilkald personale</p>

      <div
        className={styles.dots}
        aria-label={`${solvedCount} af ${totalCount} kort scannet`}
      >
        {Array.from({ length: totalCount }, (_, index) => (
          <span key={index} className={index < solvedCount ? styles.dotSolved : styles.dot} />
        ))}
      </div>

      {isPenalty && (
        <div className={styles.penalty}>
          <p className={styles.penaltyText}>Forkert kort</p>
          <p className={styles.countdown}>{remainingSeconds}</p>
        </div>
      )}
    </div>
  )
}
