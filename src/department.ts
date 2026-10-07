export type Department = 'kasse' | 'posthus'

// afdeling=posthus viser posthuset. Alt andet viser kassen.
export function getDepartment(search: string): Department {
  return new URLSearchParams(search).get('afdeling') === 'posthus' ? 'posthus' : 'kasse'
}
