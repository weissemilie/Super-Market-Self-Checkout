import { useEffect, useState } from 'react'
import type { ActiveErrorState } from '../checkout/types'
import type { LampColor } from '../data'
import { MockLampView } from '../lamp/MockLampView'
import { shouldShowHint } from './errorHint'
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

  // Hintet beregnes direkte fra errorStartedAt og den løbende now - ingen
  // separat timer, bare et derived udtryk der genberegnes ved hvert tick.
  const showHint = shouldShowHint(error.errorStartedAt, now)

  const lamp = LAMP_STYLES[error.activeError.lampColor]
  const solvedCount = error.progress
  const totalCount = error.activeError.solution.length
  const dotsClassName =
    error.wrongCardsThisError > 0 ? `${styles.dots} ${styles.dotsShake}` : styles.dots

  return (
    <div
      className={styles.overlay}
      style={{ backgroundColor: lamp.background, color: lamp.color }}
    >
      <div className={styles.lampCorner}>
        <MockLampView size="large" />
      </div>

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
        key={error.wrongCardsThisError}
        className={dotsClassName}
        aria-label={`${solvedCount} af ${totalCount} kort scannet`}
      >
        {Array.from({ length: totalCount }, (_, index) => {
          const isSolved = index < solvedCount
          return (
            <span
              key={`${index}-${isSolved}`}
              className={isSolved ? styles.dotSolved : styles.dot}
            />
          )
        })}
      </div>

      {isPenalty && (
        <div className={styles.penalty}>
          <p className={styles.penaltyText}>Forkert kort</p>
          <p className={styles.countdown}>{remainingSeconds}</p>
        </div>
      )}

      {showHint && (
        <div className={styles.hintBox}>
          <svg
            className={styles.hintIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18h6" />
            <path d="M10 21h4" />
            <path d="M12 3a6 6 0 0 0-4 10.5c.6.5 1 1.3 1 2.1V16h6v-.4c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
          </svg>
          <p className={styles.hintText}>{error.activeError.hint}</p>
        </div>
      )}
    </div>
  )
}
