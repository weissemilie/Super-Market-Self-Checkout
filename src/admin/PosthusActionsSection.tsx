import type { PosthusAction } from '../posthus/types'
import styles from './AdminPanel.module.css'

interface PosthusActionsSectionProps {
  dispatch: (action: PosthusAction) => void
}

export function PosthusActionsSection({ dispatch }: PosthusActionsSectionProps) {
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
      <h2 className={styles.sectionTitle}>Nulstil</h2>
      <button type="button" className={styles.resetButton} onClick={handleReset}>
        Nulstil PostSyd
      </button>
    </section>
  )
}
