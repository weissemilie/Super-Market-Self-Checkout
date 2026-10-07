import type { PosthusAction, PosthusState } from '../../posthus/types'
import { PosthusActivityView } from './PosthusActivityView'
import { PosthusOverview } from './PosthusOverview'
import { PosthusStart } from './PosthusStart'
import styles from './PosthusScreen.module.css'

interface PosthusScreenProps {
  state: PosthusState
  dispatch: (action: PosthusAction) => void
}

export function PosthusScreen({ state, dispatch }: PosthusScreenProps) {
  return (
    <div className={styles.screen}>
      <main className={styles.main}>
        {state.activity.kind === 'idle' ? (
          <PosthusStart />
        ) : (
          <PosthusActivityView
            activity={state.activity}
            onCancel={() => dispatch({ type: 'CANCEL' })}
          />
        )}
      </main>
      <PosthusOverview parcels={state.parcels} />
    </div>
  )
}
