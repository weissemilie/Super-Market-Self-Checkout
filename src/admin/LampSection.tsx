import { useEffect, useState } from 'react'
import type { LampState } from '../lamp/LampController'
import { useLamp } from '../lamp/useLamp'
import styles from './AdminPanel.module.css'

const OFF_STATE: LampState = { color: 'off', pattern: 'steady' }

const PATTERN_LABELS: Record<LampState['pattern'], string> = {
  steady: 'Fast',
  blink: 'Blinker',
  fast: 'Blinker hurtigt',
}

export function LampSection() {
  const lamp = useLamp()
  const [lampState, setLampState] = useState<LampState>(OFF_STATE)

  useEffect(() => {
    return lamp.subscribe(setLampState)
  }, [lamp])

  const canUseSerial = typeof navigator !== 'undefined' && 'serial' in navigator

  function handleConnect() {
    void lamp.connect()
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Lampe</h2>
      <p className={styles.lampStatus}>
        {lamp.isConnected() ? 'Forbundet' : 'Ikke forbundet'} ·{' '}
        {lampState.color === 'off'
          ? 'Slukket'
          : `${lampState.color} (${PATTERN_LABELS[lampState.pattern]})`}
      </p>
      {canUseSerial && (
        <button type="button" className={styles.triggerButton} onClick={handleConnect}>
          Forbind Arduino
        </button>
      )}
    </section>
  )
}
