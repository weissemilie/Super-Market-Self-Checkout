import type { PosthusAction, PosthusState } from '../posthus/types'
import styles from './AdminPanel.module.css'
import { PosthusActionsSection } from './PosthusActionsSection'
import { PosthusStatsSection } from './PosthusStatsSection'

interface PosthusAdminPanelProps {
  state: PosthusState
  dispatch: (action: PosthusAction) => void
}

export function PosthusAdminPanel({ state, dispatch }: PosthusAdminPanelProps) {
  if (!state.adminOpen) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.heading}>Instruktørpanel · PostSyd</h1>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => dispatch({ type: 'CLOSE_ADMIN' })}
          >
            Luk
          </button>
        </header>

        <div className={styles.sections}>
          <PosthusStatsSection data={state} />
          <PosthusActionsSection dispatch={dispatch} />
        </div>
      </div>
    </div>
  )
}
