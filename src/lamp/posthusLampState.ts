import type { PosthusState } from '../posthus/types'
import type { LampState } from './LampController'

const OFF_STATE: LampState = { color: 'off', pattern: 'steady' }
const ERROR_STATE: LampState = { color: 'red', pattern: 'steady' }

// Lampen lyser, mens en fejl vises på PostSyd: en seddel uden indtjekket pakke
// (ikke ankommet eller allerede udleveret), en forkert pakke, en ukendt kode
// og en pakke, der allerede er i biksen. Skærmen styrer, hvor længe: fejlen
// forsvinder af sig selv, og så slukker lampen.
export function posthusLampStateFor(state: PosthusState): LampState {
  const { activity } = state
  switch (activity.kind) {
    case 'notArrived':
    case 'alreadyDelivered':
    case 'duplicate':
    case 'unknown':
      return ERROR_STATE
    case 'pickup':
      return activity.wrongUntil !== null ? ERROR_STATE : OFF_STATE
    case 'idle':
    case 'received':
    case 'delivered':
      return OFF_STATE
  }
}
