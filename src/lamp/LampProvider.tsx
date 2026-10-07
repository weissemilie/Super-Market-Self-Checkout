import { useEffect, useMemo, type ReactNode } from 'react'
import type { LampController } from './LampController'
import { LampContext } from './LampContext'
import { LampMux } from './LampMux'

interface LampProviderProps {
  // Udefra kan en anden LampController sættes ind her (fx i tests). Uden
  // den bruges LampMux (MockLamp + SerialLamp) som standard.
  lamp?: LampController
  children: ReactNode
}

export function LampProvider({ lamp, children }: LampProviderProps) {
  const activeLamp = useMemo(() => lamp ?? new LampMux(), [lamp])

  useEffect(() => {
    if (activeLamp instanceof LampMux) {
      void activeLamp.tryReconnect()
    }
  }, [activeLamp])

  return <LampContext.Provider value={activeLamp}>{children}</LampContext.Provider>
}
