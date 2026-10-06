import { useEffect, useState, type CSSProperties } from 'react'
import type { LampColor } from '../data'
import type { LampState } from './LampController'
import { useLamp } from './useLamp'
import styles from './MockLampView.module.css'

const OFF_STATE: LampState = { color: 'off', pattern: 'steady' }

const LAMP_COLOR_VALUES: Record<LampColor, string> = {
  yellow: '#f5c518',
  red: '#c81e2c',
  blue: '#1d4ed8',
  off: '#8a9490',
}

interface MockLampViewProps {
  // 'large' bruges på ErrorOverlay, hvor lampen skal kunne ses på afstand og
  // på alle baggrundsfarver. 'small' (standard) er til topbjælken.
  size?: 'small' | 'large'
}

export function MockLampView({ size = 'small' }: MockLampViewProps) {
  const lamp = useLamp()
  const [visible, setVisible] = useState(true)
  const [lampState, setLampState] = useState<LampState>(OFF_STATE)

  useEffect(() => {
    return lamp.subscribe(setLampState)
  }, [lamp])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'F3') {
        return
      }

      // F3 må godt skjule/vise lampen mens et inputfelt har fokus, men må
      // ikke forstyrre selve indtastningen ved at kalde preventDefault der.
      const target = event.target
      const isInputFocused =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (!isInputFocused) {
        event.preventDefault()
      }

      setVisible((wasVisible) => !wasVisible)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!visible) {
    return null
  }

  const isOn = lampState.color !== 'off'
  const patternClass =
    lampState.pattern === 'blink' ? styles.blink : lampState.pattern === 'fast' ? styles.fast : ''

  const bulbClassName = [styles.bulb, isOn ? styles.on : styles.off, isOn ? patternClass : '']
    .filter(Boolean)
    .join(' ')

  const bulbStyle = isOn
    ? ({ '--lamp-color': LAMP_COLOR_VALUES[lampState.color] } as CSSProperties)
    : undefined

  const housingClassName =
    size === 'large' ? `${styles.housing} ${styles.housingLarge}` : styles.housing

  return (
    <div
      className={styles.container}
      role="img"
      aria-label={isOn ? `Lampe tændt (${lampState.color})` : 'Lampe slukket'}
    >
      <div className={housingClassName}>
        <span className={bulbClassName} style={bulbStyle} />
      </div>
      {size === 'large' && <span className={styles.label}>LAMPE</span>}
    </div>
  )
}
