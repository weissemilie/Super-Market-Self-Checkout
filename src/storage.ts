// Generiske hjælpefunktioner til localStorage. Læsning og skrivning er altid
// pakket ind i try/catch, så appen virker uden gemte data (fx private
// browsing, fuld storage, eller korrupt/ugyldigt indhold).

export function loadJson<T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignorer skrivefejl - appen skal kunne køre uden gemte indstillinger.
  }
}
