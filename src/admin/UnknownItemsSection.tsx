import type { CheckoutAction, CheckoutSettings } from '../checkout/types'
import styles from './AdminPanel.module.css'

interface UnknownItemsSectionProps {
  settings: CheckoutSettings
  dispatch: (action: CheckoutAction) => void
}

export function UnknownItemsSection({ settings, dispatch }: UnknownItemsSectionProps) {
  function setMode(mode: 'accept' | 'error') {
    dispatch({
      type: 'SET_SETTINGS',
      settings: { unknownProductMode: mode },
      now: Date.now(),
    })
  }

  function setChance(percent: number) {
    dispatch({
      type: 'SET_SETTINGS',
      settings: { unknownErrorChance: percent / 100 },
      now: Date.now(),
    })
  }

  const percent = Math.round(settings.unknownErrorChance * 100)

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Ukendte varer</h2>

      <div className={styles.presetRow}>
        <button
          type="button"
          className={
            settings.unknownProductMode === 'accept'
              ? `${styles.presetButton} ${styles.presetButtonActive}`
              : styles.presetButton
          }
          onClick={() => setMode('accept')}
        >
          Accept
        </button>
        <button
          type="button"
          className={
            settings.unknownProductMode === 'error'
              ? `${styles.presetButton} ${styles.presetButtonActive}`
              : styles.presetButton
          }
          onClick={() => setMode('error')}
        >
          Fejl
        </button>
      </div>

      <label className={styles.sliderRow}>
        <span>Chance for fejl ved ukendt vare: {percent}%</span>
        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(event) => setChance(Number(event.target.value))}
        />
      </label>
    </section>
  )
}
