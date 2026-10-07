import type { ReactNode } from 'react'
import styles from './PosthusStart.module.css'

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <div className={styles.badge}>
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </div>
  )
}

export function PosthusStart() {
  return (
    <div className={styles.start}>
      <section className={styles.card}>
        <IconBadge>
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
          <path d="M12 3v9" />
          <path d="M8.5 9l3.5 3 3.5-3" />
        </IconBadge>
        <h2 className={styles.title}>Indlevering</h2>
        <p className={styles.text}>Scan labelen på pakken</p>
      </section>
      <section className={styles.card}>
        <IconBadge>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </IconBadge>
        <h2 className={styles.title}>Udlevering</h2>
        <p className={styles.text}>Scan kundens afhentningsseddel</p>
      </section>
    </div>
  )
}
