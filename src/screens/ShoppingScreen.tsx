import type { CartItem, CheckoutAction } from '../checkout/types'
import type { RecentScan } from '../checkout/useCheckout'
import { formatPrice } from '../format'
import styles from './ShoppingScreen.module.css'

interface ShoppingScreenProps {
  cart: CartItem[]
  recentScans: RecentScan[]
  dispatch: (action: CheckoutAction) => void
}

export function ShoppingScreen({ cart, recentScans, dispatch }: ShoppingScreenProps) {
  const latestScan = recentScans[0]
  const total = cart.reduce((sum, item) => sum + item.priceDkk * item.quantity, 0)
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const newestFirst = [...cart].reverse()

  function handlePay() {
    dispatch({ type: 'START_PAYMENT', now: Date.now() })
  }

  return (
    <div className={styles.screen}>
      <div className={styles.cartPanel}>
        <ul className={styles.cart}>
          {newestFirst.length === 0 && <li className={styles.empty}>Kurven er tom</li>}
          {newestFirst.map((item) => {
            // Nøglet på scanningens id, når varen er den senest scannede, så
            // kant-animationen starter forfra ved en ny scanning af den -
            // også hvis det er en gentagelse af samme kode.
            const isLatest = latestScan !== undefined && item.barcode === latestScan.code
            const key =
              latestScan !== undefined && item.barcode === latestScan.code
                ? `${item.barcode}-${latestScan.id}`
                : item.barcode

            return (
              <li
                key={key}
                className={isLatest ? `${styles.item} ${styles.itemHighlighted}` : styles.item}
              >
                <span className={styles.name}>{item.name}</span>
                <span className={styles.quantity}>x{item.quantity}</span>
                <span className={styles.price}>
                  {formatPrice(item.priceDkk * item.quantity)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className={styles.summaryPanel}>
        <div className={styles.summaryInfo}>
          <span className={styles.itemCountLabel}>Antal varer</span>
          <span className={styles.itemCount}>{itemCount}</span>
        </div>
        <div className={styles.totalBlock}>
          <span className={styles.totalLabel}>Total</span>
          <span className={styles.total}>{formatPrice(total)}</span>
        </div>
        <button
          type="button"
          className={styles.payButton}
          onClick={handlePay}
          disabled={cart.length === 0}
        >
          Gå til betaling
        </button>
      </div>
    </div>
  )
}
