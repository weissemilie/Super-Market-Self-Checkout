import styles from './print.module.css'

export function PrintButton() {
  return (
    <button type="button" className={styles.printButton} onClick={() => window.print()}>
      Print
    </button>
  )
}
