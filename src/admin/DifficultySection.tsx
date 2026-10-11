import type { ErrorPresetName } from '../errors/errorEngine'
import type { UseErrorGeneratorConfigResult } from '../errors/useErrorGeneratorConfig'
import styles from './AdminPanel.module.css'

const PRESET_OPTIONS: Array<{ value: ErrorPresetName; label: string }> = [
  { value: 'let', label: 'Let' },
  { value: 'normal', label: 'Normal' },
  { value: 'kaos', label: 'Kaos' },
]

interface DifficultySectionProps {
  errorGenerator: UseErrorGeneratorConfigResult
}

export function DifficultySection({ errorGenerator }: DifficultySectionProps) {
  const { preset, enabled, chancePerScan, setPreset, setChancePerScan, setEnabled } =
    errorGenerator
  const percent = Math.round(chancePerScan * 100)

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Sværhedsgrad</h2>
      <p className={styles.helpText}>
        Kassen kaster tilfældige fejl, både med jævne mellemrum og efter scannede
        varer. Sværhedsgraden vælger, hvor ofte.
      </p>

      <div className={styles.presetRow}>
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              option.value === preset
                ? `${styles.presetButton} ${styles.presetButtonActive}`
                : styles.presetButton
            }
            onClick={() => setPreset(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className={styles.sliderRow}>
        <span>Chance for en tilfældig fejl efter hver scannet vare: {percent} %</span>
        <input
          type="range"
          min={0}
          max={100}
          value={percent}
          disabled={!enabled}
          onChange={(event) => setChancePerScan(Number(event.target.value) / 100)}
        />
        <span className={styles.helpText}>
          Fejlen vælges blandt de afkrydsede i listen "Fejl". Aldersgrænse (E03) og
          ukendte varer (E02) kommer oven i dette.
        </span>
      </label>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Fejlgenerator aktiv
      </label>
    </section>
  )
}
