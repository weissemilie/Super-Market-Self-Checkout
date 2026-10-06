export const HINT_DELAY_MS = 90000

// Ren funktion: hintet vises ud fra forskellen mellem now og errorStartedAt,
// ikke en separat timer i komponenten.
export function shouldShowHint(errorStartedAt: number, now: number): boolean {
  return now - errorStartedAt >= HINT_DELAY_MS
}
