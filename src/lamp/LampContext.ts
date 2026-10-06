import { createContext } from 'react'
import type { LampController } from './LampController'

export const LampContext = createContext<LampController | null>(null)
