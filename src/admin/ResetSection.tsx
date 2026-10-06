import type { CheckoutAction } from '../checkout/types'
import styles from './AdminPanel.module.css'

interface ResetSectionProps {
  dispatch: (action: CheckoutAction) => void
}

export function ResetSection({ dispatch }: ResetSectionProps) {
  function handleReset() {
    const confirmed = window.confirm(
      'Nulstil kassen? Kurven tømmes, og statistikken nulstilles.',
    )
    if (confirmed) {
      dispatch({ type: 'RESET', now: Date.now() })
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Nulstil</h2>
      <button type="button" className={styles.resetButton} onClick={handleReset}>
        Nulstil kasse
      </button>
    </section>
  )
}
