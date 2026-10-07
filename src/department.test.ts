import { describe, expect, it } from 'vitest'
import { getDepartment } from './department'

describe('getDepartment', () => {
  it('viser posthuset for afdeling=posthus', () => {
    expect(getDepartment('?afdeling=posthus')).toBe('posthus')
    expect(getDepartment('?x=1&afdeling=posthus')).toBe('posthus')
  })

  it('viser kassen for alt andet', () => {
    expect(getDepartment('')).toBe('kasse')
    expect(getDepartment('?afdeling=kasse')).toBe('kasse')
    expect(getDepartment('?afdeling=andet')).toBe('kasse')
    expect(getDepartment('?afdeling=POSTHUS')).toBe('kasse')
  })
})
