import type { FlashMessage } from '../checkout/types'
import styles from './FlashBanner.module.css'

interface FlashBannerProps {
  flash: FlashMessage | null
}

export function FlashBanner({ flash }: FlashBannerProps) {
  if (!flash) {
    return null
  }

  const kindClassName =
    flash.kind === 'success'
      ? styles.success
      : flash.kind === 'error'
        ? styles.error
        : styles.info

  return (
    <div key={flash.expiresAt} className={`${styles.banner} ${kindClassName}`} role="status">
      {flash.kind === 'success' && (
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span>{flash.text}</span>
    </div>
  )
}
