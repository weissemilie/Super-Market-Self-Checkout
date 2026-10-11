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
  // "Udløs nu" lukker panelet og starter fejlen med det samme.
  function handleTriggerError(errorCode: string) {
    dispatch({ type: 'CLOSE_ADMIN' })
    dispatch({ type: 'TRIGGER_ERROR', errorCode, now: Date.now() })
  }

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
            onTriggerError={handleTriggerError}
          />
          <UnknownItemsSection settings={state.settings} dispatch={dispatch} />
          <LampSection />
          <ResetSection dispatch={dispatch} />
        </div>

      </div>
    </div>
  )
}
