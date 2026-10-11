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
  const alwaysError = settings.unknownProductMode === 'error'

  function optionClassName(active: boolean): string {
    return active ? `${styles.optionButton} ${styles.optionButtonActive}` : styles.optionButton
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Ukendte varer</h2>
      <p className={styles.helpText}>
        En ukendt vare er en stregkode, som ikke findes i kassens vareliste, fx en
        vare spejderne selv har med. Vælg, hvad kassen skal gøre, når den scannes.
      </p>

      <div className={styles.optionRow}>
        <button
          type="button"
          className={optionClassName(!alwaysError)}
          onClick={() => setMode('accept')}
        >
          <span className={styles.optionTitle}>Tag varen med</span>
          <span className={styles.optionHint}>
            Varen kommer i kurven med en tilfældig pris. Der er dog en chance for
            fejlen E02 "Varen blev ikke fundet".
          </span>
        </button>
        <button
          type="button"
          className={optionClassName(alwaysError)}
          onClick={() => setMode('error')}
        >
          <span className={styles.optionTitle}>Giv altid fejl</span>
          <span className={styles.optionHint}>
            Hver ukendt vare giver fejlen E02, som løses med KORT01 og KORT03.
          </span>
        </button>
      </div>

      <p className={styles.statusLine}>
        {alwaysError
          ? 'Lige nu: alle ukendte varer giver fejlen E02.'
          : `Lige nu: ukendte varer tages med, og ${percent} % giver fejlen E02.`}
      </p>

      <label className={styles.sliderRow}>
        <span>
          Chance for fejl E02 ved en ukendt vare: {percent} %
          {alwaysError && ' (bruges ikke, når alle ukendte varer giver fejl)'}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          disabled={alwaysError}
          onChange={(event) => setChance(Number(event.target.value))}
        />
      </label>
    </section>
  )
}
