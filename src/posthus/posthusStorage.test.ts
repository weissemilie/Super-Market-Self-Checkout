/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { createEmptyData } from './posthusReducer'
import { loadPosthusData, savePosthusData } from './posthusStorage'

afterEach(() => localStorage.clear())

describe('posthusStorage', () => {
  it('giver tomme data uden gemte data eller med ødelagte data', () => {
    expect(loadPosthusData()).toEqual(createEmptyData())
    localStorage.setItem('spejder-super.posthus', '{ikke json')
    expect(loadPosthusData()).toEqual(createEmptyData())
  })

  it('gemmer og henter data', () => {
    const data = createEmptyData()
    data.stats.checkIns = 3
    savePosthusData(data)
    expect(loadPosthusData()).toEqual(data)
  })

  it('tæller registrerede pakker som indleveringer i data gemt uden checkIns', () => {
    const data = createEmptyData()
    data.parcels.PAKKE001 = { ...data.parcels.PAKKE001, status: 'i biksen', registeredAt: 1 }
    const oldStats = { wrongParcels: 0, deliveryTimesMs: [] }
    localStorage.setItem(
      'spejder-super.posthus',
      JSON.stringify({ parcels: data.parcels, stats: oldStats }),
    )
    expect(loadPosthusData().stats.checkIns).toBe(1)
  })
})
