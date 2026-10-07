import { useEffect, useState } from 'react'
import type { LampColor } from '../data'
import type { LampConnectionStatus, LampState } from '../lamp/LampController'
import { useLamp } from '../lamp/useLamp'
import styles from './AdminPanel.module.css'

const OFF_STATE: LampState = { color: 'off', pattern: 'steady' }

const PATTERN_LABELS: Record<LampState['pattern'], string> = {
  steady: 'Fast',
  blink: 'Blinker',
  fast: 'Blinker hurtigt',
}

const CONNECTION_LABELS: Record<LampConnectionStatus, string> = {
  disconnected: 'Ikke forbundet',
  connected: 'Forbundet',
  'connection-lost': 'Forbindelse tabt',
}

const TEST_COLORS: Array<{ color: LampColor; label: string }> = [
  { color: 'red', label: 'Test rød' },
  { color: 'yellow', label: 'Test gul' },
  { color: 'blue', label: 'Test blå' },
]

export function LampSection() {
  const lamp = useLamp()
  const [lampState, setLampState] = useState<LampState>(OFF_STATE)
  const [connectionStatus, setConnectionStatus] = useState<LampConnectionStatus>(() =>
    lamp.getConnectionStatus(),
  )
  const [connectError, setConnectError] = useState<string | null>(null)

  useEffect(() => lamp.subscribe(setLampState), [lamp])
  useEffect(() => lamp.subscribeConnectionStatus(setConnectionStatus), [lamp])

  const canUseSerial = typeof navigator !== 'undefined' && 'serial' in navigator

  async function handleConnect() {
    setConnectError(null)
    try {
      await lamp.connect()
    } catch (error) {
      setConnectError(
        error instanceof Error ? error.message : 'Kunne ikke forbinde til lampen.',
      )
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Lampe</h2>
      <p className={styles.lampStatus}>
        {CONNECTION_LABELS[connectionStatus]} ·{' '}
        {lampState.color === 'off'
          ? 'Slukket'
          : `${lampState.color} (${PATTERN_LABELS[lampState.pattern]})`}
      </p>

      {connectError && <p className={styles.lampError}>{connectError}</p>}

      {canUseSerial ? (
        <button type="button" className={styles.triggerButton} onClick={handleConnect}>
          Forbind Arduino
        </button>
      ) : (
        <p className={styles.lampError}>Brug Chrome eller Edge for at forbinde lampen</p>
      )}

      <div className={styles.testButtonRow}>
        {TEST_COLORS.map((test) => (
          <button
            key={test.color}
            type="button"
            className={styles.triggerButton}
            onClick={() => lamp.show(test.color, 'steady')}
          >
            {test.label}
          </button>
        ))}
        <button type="button" className={styles.triggerButton} onClick={() => lamp.off()}>
          Sluk
        </button>
      </div>
    </section>
  )
}
