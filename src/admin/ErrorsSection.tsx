import { errors } from '../data'
import type { UseErrorGeneratorConfigResult } from '../errors/useErrorGeneratorConfig'
import styles from './AdminPanel.module.css'

// E02 og E03 udløses kun af reduceren selv og kan derfor ikke slås fra her,
// men kan stadig udløses manuelt med "Udløs nu".
const ALWAYS_ON_CODES = new Set(['E02', 'E03'])

interface ErrorsSectionProps {
  errorGenerator: UseErrorGeneratorConfigResult
  onTriggerError: (code: string) => void
}

export function ErrorsSection({ errorGenerator, onTriggerError }: ErrorsSectionProps) {
  const { enabledErrors, toggleErrorEnabled } = errorGenerator

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Fejl</h2>

      <p className={styles.helpText}>
        De afkrydsede fejl kan komme tilfældigt, også efter en scannet vare. "Udløs nu"
        lukker panelet og starter fejlen med det samme.
      </p>

      <ul className={styles.errorList}>
        {errors.map((error) => {
          const isAlwaysOn = ALWAYS_ON_CODES.has(error.code)
          const isEnabled = isAlwaysOn || enabledErrors.includes(error.code)

          return (
            <li key={error.code} className={styles.errorRow}>
              <label className={styles.errorCheckLabel}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  disabled={isAlwaysOn}
                  onChange={() => toggleErrorEnabled(error.code)}
                />
                <span className={styles.errorCode}>{error.code}</span>
                <span className={styles.errorTitle}>{error.title}</span>
              </label>
              <button
                type="button"
                className={styles.triggerButton}
                onClick={() => onTriggerError(error.code)}
              >
                Udløs nu
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
