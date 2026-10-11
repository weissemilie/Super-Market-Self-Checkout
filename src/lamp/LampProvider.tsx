import { useEffect, useMemo, type ReactNode } from 'react'
import type { LampController } from './LampController'
import { LampContext } from './LampContext'
import { SerialLamp } from './SerialLamp'

interface LampProviderProps {
  // Udefra kan en anden LampController sættes ind her (fx i tests). Uden
  // den bruges den fysiske lampe (SerialLamp) som standard.
  lamp?: LampController
  children: ReactNode
}

export function LampProvider({ lamp, children }: LampProviderProps) {
  const activeLamp = useMemo(() => lamp ?? new SerialLamp(), [lamp])

  useEffect(() => {
    if (activeLamp instanceof SerialLamp) {
      void activeLamp.tryReconnect()
    }
  }, [activeLamp])

  return <LampContext.Provider value={activeLamp}>{children}</LampContext.Provider>
}
