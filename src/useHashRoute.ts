import { useEffect, useState } from 'react'

// Simpel hash-baseret routing uden router bibliotek. Returnerer den rå
// location.hash (fx "#print"), og opdateres når brugeren navigerer.
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return hash
}
