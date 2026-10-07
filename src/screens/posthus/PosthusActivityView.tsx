import { formatTimeOfDay } from '../../format'
import type { PosthusActivity } from '../../posthus/types'
import styles from './PosthusActivityView.module.css'

interface PosthusActivityViewProps {
  activity: Exclude<PosthusActivity, { kind: 'idle' }>
  onCancel: () => void
}

type Tone = 'success' | 'error' | 'info'

interface Content {
  tone: Tone
  code: string
  message: string
  detail?: string
  // Vises i pickup mens den forkerte pakke er scannet.
  errorText?: string
  cancellable?: boolean
}

function describe(activity: PosthusActivityViewProps['activity']): Content {
  switch (activity.kind) {
    case 'received':
      return { tone: 'success', code: activity.parcelCode, message: 'Pakken er modtaget' }
    case 'duplicate':
      return {
        tone: 'error',
        code: activity.parcelCode,
        message: 'Pakken er allerede i biksen',
      }
    case 'unknown':
      return { tone: 'error', code: activity.code, message: 'Ukendt kode' }
    case 'pickup':
      return {
        tone: 'info',
        code: activity.slipCode,
        message: 'Pakken er hjemme. Find pakken og scan dens label',
        errorText: activity.wrongUntil !== null ? 'Forkert pakke' : undefined,
        cancellable: true,
      }
    case 'notArrived':
      return {
        tone: 'error',
        code: activity.slipCode,
        message: 'Pakken er ikke ankommet endnu',
        cancellable: true,
      }
    case 'alreadyDelivered':
      return {
        tone: 'error',
        code: activity.slipCode,
        message: 'Pakken er allerede udleveret',
        detail: `Udleveret kl. ${formatTimeOfDay(activity.deliveredAt)}`,
        cancellable: true,
      }
    case 'delivered':
      return {
        tone: 'success',
        code: activity.parcelCode,
        message: 'Pakken er udleveret',
        detail: `Kl. ${formatTimeOfDay(activity.deliveredAt)}`,
      }
  }
}

const TONE_CLASS: Record<Tone, string> = {
  success: styles.success,
  error: styles.error,
  info: styles.info,
}

export function PosthusActivityView({ activity, onCancel }: PosthusActivityViewProps) {
  const content = describe(activity)

  return (
    <div className={`${styles.view} ${TONE_CLASS[content.tone]}`} role="status">
      <div className={styles.code}>{content.code}</div>
      <p className={styles.message}>{content.message}</p>
      {content.detail && <p className={styles.detail}>{content.detail}</p>}
      {content.errorText && <p className={styles.wrong}>{content.errorText}</p>}
      {content.cancellable && (
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Afbryd
        </button>
      )}
    </div>
  )
}
