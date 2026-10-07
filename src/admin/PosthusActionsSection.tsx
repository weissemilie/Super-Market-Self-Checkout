import type { PosthusAction } from '../posthus/types'
import styles from './AdminPanel.module.css'

interface PosthusActionsSectionProps {
  dispatch: (action: PosthusAction) => void
  onRegisterRandom: () => void
}

export function PosthusActionsSection({
  dispatch,
  onRegisterRandom,
}: PosthusActionsSectionProps) {
  function handleReset() {
    const confirmed = window.confirm(
      'Nulstil PostSyd? Alle pakker og al statistik nulstilles.',
    )
    if (confirmed) {
      dispatch({ type: 'RESET' })
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Pakker</h2>
      <div className={styles.testButtonRow}>
        <button type="button" className={styles.presetButton} onClick={onRegisterRandom}>
          Registrer 10 tilfældige pakker
        </button>
        <button type="button" className={styles.resetButton} onClick={handleReset}>
          Nulstil PostSyd
        </button>
      </div>
    </section>
  )
}
