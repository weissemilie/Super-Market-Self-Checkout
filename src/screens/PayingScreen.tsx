import { useEffect } from 'react'
import type { CheckoutAction } from '../checkout/types'
import styles from './PayingScreen.module.css'

const PAYMENT_DURATION_MS = 5000

interface PayingScreenProps {
  active: boolean
  dispatch: (action: CheckoutAction) => void
}

export function PayingScreen({ active, dispatch }: PayingScreenProps) {
  useEffect(() => {
    if (!active) return
    const timeout = setTimeout(() => {
      dispatch({ type: 'PAYMENT_DONE', now: Date.now() })
    }, PAYMENT_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [active, dispatch])

  return (
    <div className={styles.screen}>
      <svg
        className={styles.cardIcon}
        viewBox="0 0 64 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="60" height="40" rx="6" />
        <rect x="2" y="13" width="60" height="7" fill="currentColor" stroke="none" />
        <rect x="8" y="28" width="16" height="6" rx="1.5" fill="currentColor" stroke="none" />
      </svg>
      <p className={styles.text}>Indsæt eller hold dit kort mod terminalen</p>
      {/* Et nyt element pr. gentagelse af PAYING, så fremdriftsbjælken starter
          forfra efter en fejl har afbrudt betalingen. */}
      {active && <div className={styles.progressBar} />}
    </div>
  )
}
