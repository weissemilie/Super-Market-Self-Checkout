import { useEffect, useState, type FormEvent } from 'react'
import { findProduct, findStaffCard } from '../data'
import styles from './ScanDebug.module.css'

type ScanKind = 'vare' | 'personalekort' | 'ukendt'

const KIND_LABELS: Record<ScanKind, string> = {
  vare: 'Vare',
  personalekort: 'Personalekort',
  ukendt: 'Ukendt',
}

function classifyCode(code: string): ScanKind {
  if (findProduct(code)) return 'vare'
  if (findStaffCard(code)) return 'personalekort'
  return 'ukendt'
}

interface RecentScan {
  id: number
  code: string
  time: number
}

interface ScanDebugProps {
  recentScans: RecentScan[]
  simulateScan: (code: string) => void
}

export function ScanDebug({ recentScans, simulateScan }: ScanDebugProps) {
  const [visible, setVisible] = useState(false)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    function handleToggleKey(event: KeyboardEvent) {
      const isToggleShortcut =
        event.key === 'F2' || (event.ctrlKey && event.key.toLowerCase() === 'd')
      if (isToggleShortcut) {
        event.preventDefault()
        setVisible((wasVisible) => !wasVisible)
      }
    }
    window.addEventListener('keydown', handleToggleKey)
    return () => window.removeEventListener('keydown', handleToggleKey)
  }, [])

  function handleInputSubmit(event: FormEvent) {
    event.preventDefault()
    const code = inputValue.trim().toUpperCase()
    if (code.length > 0) {
      simulateScan(code)
    }
    setInputValue('')
  }

  if (!visible) {
    return null
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Scanner debug (F2 eller Ctrl+D for at skjule)</h2>

      <form onSubmit={handleInputSubmit} className={styles.form}>
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Indtast kode og tryk Enter"
          className={styles.input}
        />
      </form>
      <ul className={styles.list}>
        {recentScans.map((entry) => (
          <li key={entry.id} className={styles.entry}>
            <span className={styles.time}>
              {new Date(entry.time).toLocaleTimeString('da-DK')}
            </span>
            <span className={styles.code}>{entry.code}</span>
            <span className={styles.kind}>
              {KIND_LABELS[classifyCode(entry.code)]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
