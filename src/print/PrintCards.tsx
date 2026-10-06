import { CartLogo } from '../CartLogo'
import { staffCards } from '../data'
import { Barcode } from './Barcode'
import { PrintButton } from './PrintButton'
import styles from './PrintCards.module.css'
import printStyles from './print.module.css'

const CARDS_PER_PAGE = 8

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

export function PrintCards() {
  // MESTER har sin egen side i en anden farve og vises ikke blandt de
  // almindelige personalekort.
  const regularCards = staffCards.filter((card) => card.code !== 'MESTER')
  const mesterCard = staffCards.find((card) => card.code === 'MESTER')
  const pages = chunk(regularCards, CARDS_PER_PAGE)

  return (
    <div className={printStyles.screen}>
      <PrintButton />
      <div className={printStyles.pages}>
        {pages.map((page, pageIndex) => (
          <div key={pageIndex} className={styles.page}>
            {page.map((card) => (
              <div key={card.code} className={styles.cardCell}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <CartLogo className={styles.cardLogo} />
                    <span className={styles.cardBrand}>Spejder Super</span>
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.cardName}>{card.label}</p>
                    <div className={styles.barcodeWrap}>
                      <Barcode value={card.code} className={styles.barcode} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {mesterCard && (
          <div className={`${styles.page} ${styles.mesterPageWrap}`}>
            <div className={`${styles.card} ${styles.mesterCard}`}>
              <div className={`${styles.cardHeader} ${styles.mesterHeader}`}>
                <CartLogo className={styles.cardLogo} />
                <span className={styles.cardBrand}>Spejder Super</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardName}>{mesterCard.label}</p>
                <p className={styles.mesterWarning}>Kun for instruktør</p>
                <div className={styles.barcodeWrap}>
                  <Barcode value={mesterCard.code} className={styles.barcode} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
