import { useMemo, type ReactNode } from 'react'
import type { LampController } from './LampController'
import { LampContext } from './LampContext'
import { MockLamp } from './MockLamp'

interface LampProviderProps {
  // Udefra kan en anden LampController (fx en rigtig Arduino-lampe) sættes
  // ind her senere. Uden den bruges MockLamp som standard.
  lamp?: LampController
  children: ReactNode
}

export function LampProvider({ lamp, children }: LampProviderProps) {
  const activeLamp = useMemo(() => lamp ?? new MockLamp(), [lamp])

  return <LampContext.Provider value={activeLamp}>{children}</LampContext.Provider>
}
