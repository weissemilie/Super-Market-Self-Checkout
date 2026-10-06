import { CartLogo } from '../CartLogo'
import { errors, findStaffCard } from '../data'
import styles from './ErrorManual.module.css'
import { PrintButton } from './PrintButton'
import printStyles from './print.module.css'

const ERRORS_PER_PAGE = 2

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

// Kortkoderne må ikke stå i manualen, kun kortenes navne.
function solutionStepLabels(solution: string[]): string[] {
  return solution.map((code) => findStaffCard(code)?.label ?? code)
}

export function ErrorManual() {
  const pages = chunk(errors, ERRORS_PER_PAGE)

  return (
    <div className={printStyles.screen}>
      <PrintButton />
      <div className={printStyles.pages}>
        <div className={styles.coverPage}>
          <CartLogo className={styles.coverLogo} />
          <span className={styles.coverBrand}>Spejder Super</span>
          <h1 className={styles.coverTitle}>Fejlmanual for selvbetjeningskasse</h1>
          <p className={styles.coverGuide}>
            Når kassen låses, viser skærmen en fejlkode og en kort besked. Find
            fejlkoden i denne manual, og følg instruktionen for at scanne de
            rigtige personalekort i den rigtige rækkefølge.
          </p>
        </div>

        {pages.map((pair, pageIndex) => (
          <div key={pageIndex} className={styles.page}>
            {pair.map((error) => (
              <div key={error.code} className={styles.errorBlock}>
                <p className={styles.errorCode}>{error.code}</p>
                <h2 className={styles.errorTitle}>{error.title}</h2>

                <p className={styles.errorDescriptionLabel}>Problem</p>
                <p className={styles.errorDescription}>{error.message}</p>

                <p className={styles.errorSolutionLabel}>Løsning</p>
                <ol className={styles.solutionList}>
                  {solutionStepLabels(error.solution).map((label, index) => (
                    <li key={index}>Scan kortet {label}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
