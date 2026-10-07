export type Department = 'kasse' | 'posthus'

// afdeling=postsyd (eller det ældre posthus) viser PostSyd. Alt andet viser kassen.
const POST_DEPARTMENT_PARAMS = ['postsyd', 'posthus']

export function getDepartment(search: string): Department {
  const value = new URLSearchParams(search).get('afdeling')
  return value !== null && POST_DEPARTMENT_PARAMS.includes(value) ? 'posthus' : 'kasse'
}
