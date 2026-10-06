import { useContext } from 'react'
import { LampContext } from './LampContext'
import type { LampController } from './LampController'

export function useLamp(): LampController {
  const lamp = useContext(LampContext)
  if (!lamp) {
    throw new Error('useLamp skal bruges inden i en LampProvider')
  }
  return lamp
}
