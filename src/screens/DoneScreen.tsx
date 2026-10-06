import type { Receipt } from '../checkout/types'
import { formatPrice } from '../format'
import styles from './DoneScreen.module.css'

interface DoneScreenProps {
  receipt: Receipt | null
}

export function DoneScreen({ receipt }: DoneScreenProps) {
  return (
    <div className={styles.screen}>
      <svg
        className={styles.checkIcon}
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="28" />
        <path d="M20 33 L28 41 L45 24" />
      </svg>
      <p className={styles.thanks}>Tak for dit køb</p>
      <div className={styles.receipt}>
        <ul className={styles.items}>
          {receipt?.items.map((item) => (
            <li key={item.barcode} className={styles.item}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.quantity}>x{item.quantity}</span>
              <span className={styles.price}>
                {formatPrice(item.priceDkk * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.divider} />
        <div className={styles.total}>
          <span>Total</span>
          <span>{formatPrice(receipt?.totalDkk ?? 0)}</span>
        </div>
      </div>
    </div>
  )
}
