import { useEffect, useRef, useState } from 'react'
import type { CheckoutAction, CheckoutState } from '../checkout/types'
import type { UseErrorGeneratorConfigResult } from '../errors/useErrorGeneratorConfig'
import styles from './AdminPanel.module.css'
import { DifficultySection } from './DifficultySection'
import { ErrorsSection } from './ErrorsSection'
import { LampSection } from './LampSection'
import { ResetSection } from './ResetSection'
import { StatsSection } from './StatsSection'
import { UnknownItemsSection } from './UnknownItemsSection'

interface AdminPanelProps {
  open: boolean
  state: CheckoutState
  dispatch: (action: CheckoutAction) => void
  errorGenerator: UseErrorGeneratorConfigResult
}

export function AdminPanel({ open, state, dispatch, errorGenerator }: AdminPanelProps) {
  const [queuedErrorCode, setQueuedErrorCode] = useState<string | null>(null)
  const wasOpenRef = useRef(open)

  // Panelet kan altid mountes (så dette virker uanset hvordan det lukkes -
  // Ctrl+Shift+A, MESTER eller luk-knappen), og udløser den valgte fejl lige
  // efter at det er lukket, så spejderne kan se den med det samme.
  useEffect(() => {
    const wasOpen = wasOpenRef.current
    wasOpenRef.current = open

    if (wasOpen && !open && queuedErrorCode) {
      dispatch({ type: 'TRIGGER_ERROR', errorCode: queuedErrorCode, now: Date.now() })
      setQueuedErrorCode(null)
    }
  }, [open, queuedErrorCode, dispatch])

  if (!open) {
    return null
  }

  function handleClose() {
    dispatch({ type: 'CLOSE_ADMIN' })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.heading}>Instruktørpanel</h1>
          <button type="button" className={styles.closeButton} onClick={handleClose}>
            Luk
          </button>
        </header>

        <div className={styles.sections}>
          <StatsSection stats={state.stats} />
          <DifficultySection errorGenerator={errorGenerator} />
          <ErrorsSection
            errorGenerator={errorGenerator}
            queuedErrorCode={queuedErrorCode}
            onQueueError={setQueuedErrorCode}
          />
          <UnknownItemsSection settings={state.settings} dispatch={dispatch} />
          <LampSection />
          <ResetSection dispatch={dispatch} />
        </div>

        <footer className={styles.footer}>
          <a href="#print" className={styles.footerLink}>
            Udskriv kvittering
          </a>
          <a href="#manual" className={styles.footerLink}>
            Manual
          </a>
        </footer>
      </div>
    </div>
  )
}
