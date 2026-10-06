import styles from './WelcomeScreen.module.css'

export function WelcomeScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.circle}>
        <svg
          className={styles.icon}
          viewBox="0 0 48 32"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="3" height="24" />
          <rect x="7" y="4" width="1.5" height="24" />
          <rect x="11" y="4" width="2" height="24" />
          <rect x="15" y="4" width="4" height="24" />
          <rect x="21" y="4" width="1.5" height="24" />
          <rect x="24" y="4" width="2" height="24" />
          <rect x="28" y="4" width="3" height="24" />
          <rect x="33" y="4" width="1.5" height="24" />
          <rect x="36" y="4" width="2" height="24" />
          <rect x="40" y="4" width="4" height="24" />
        </svg>
      </div>
      <p className={styles.text}>Scan din første vare for at starte</p>
    </div>
  )
}
