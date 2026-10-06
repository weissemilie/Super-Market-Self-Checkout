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
  const { preset, enabled, setPreset, setEnabled } = errorGenerator

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Sværhedsgrad</h2>

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
