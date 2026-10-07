import { describe, expect, it } from 'vitest'
import { parseCode } from './codes'
import { createInitialState, posthusReducer } from './posthusReducer'
import { pickRandomUnregistered } from './randomParcels'
import { registeredParcelsSorted } from './parcelStatus'
import type { PosthusAction, PosthusState } from './types'

function run(state: PosthusState, ...actions: PosthusAction[]): PosthusState {
  return actions.reduce(posthusReducer, state)
}

const scan = (code: string, now: number): PosthusAction => ({ type: 'SCAN', code, now })

describe('parseCode', () => {
  it('genkender pakker og sedler og finder pakken til en seddel', () => {
    expect(parseCode('PAKKE001')).toEqual({ kind: 'parcel', code: 'PAKKE001' })
    expect(parseCode('SEDDEL040')).toEqual({
      kind: 'slip',
      code: 'SEDDEL040',
      parcelCode: 'PAKKE040',
    })
  })

  it('afviser koder uden for 001-040 og ukendte koder', () => {
    expect(parseCode('PAKKE000')).toBeNull()
    expect(parseCode('PAKKE041')).toBeNull()
    expect(parseCode('SEDDEL1')).toBeNull()
    expect(parseCode('5701000000001')).toBeNull()
  })
})

describe('posthusReducer', () => {
  it('starter med 40 pakker, der ikke er ankommet', () => {
    const state = createInitialState()
    expect(Object.keys(state.parcels)).toHaveLength(40)
    expect(registeredParcelsSorted(state.parcels)).toHaveLength(0)
    expect(state.activity.kind).toBe('idle')
  })

  describe('indlevering', () => {
    it('registrerer en ny pakke som i biksen med tidspunkt', () => {
      const state = run(createInitialState(), scan('PAKKE001', 1000))
      expect(state.parcels.PAKKE001).toEqual({
        code: 'PAKKE001',
        status: 'i biksen',
        registeredAt: 1000,
        deliveredAt: null,
      })
      expect(state.activity).toEqual({ kind: 'received', parcelCode: 'PAKKE001', until: 5000 })
    })

    it('fjerner beskeden efter 4 sekunder', () => {
      const received = run(createInitialState(), scan('PAKKE001', 1000))
      expect(posthusReducer(received, { type: 'TICK', now: 4999 })).toBe(received)
      expect(posthusReducer(received, { type: 'TICK', now: 5000 }).activity.kind).toBe('idle')
    })

    it('afviser dobbelt indlevering uden at ændre pakken', () => {
      const first = run(createInitialState(), scan('PAKKE001', 1000))
      const second = run(first, scan('PAKKE001', 2000))
      expect(second.parcels.PAKKE001).toEqual(first.parcels.PAKKE001)
      expect(second.activity).toMatchObject({ kind: 'duplicate', status: 'i biksen' })
    })

    it('afviser indlevering af en udleveret pakke', () => {
      const delivered = run(
        createInitialState(),
        scan('PAKKE001', 1000),
        scan('SEDDEL001', 2000),
        scan('PAKKE001', 3000),
        scan('PAKKE001', 4000),
      )
      expect(delivered.parcels.PAKKE001.status).toBe('udleveret')
      expect(delivered.activity).toMatchObject({ kind: 'duplicate', status: 'udleveret' })
    })

    it('melder ukendte koder uden at registrere noget', () => {
      const state = run(createInitialState(), scan('PAKKE099', 1000))
      expect(state.activity).toMatchObject({ kind: 'unknown', code: 'PAKKE099' })
      expect(registeredParcelsSorted(state.parcels)).toHaveLength(0)
    })
  })

  describe('udlevering', () => {
    const inBin = () => run(createInitialState(), scan('PAKKE005', 1000))

    it('venter på pakken når den er i biksen, uden at afsløre pakkenummeret på skærmen', () => {
      const state = run(inBin(), scan('SEDDEL005', 2000))
      expect(state.activity).toMatchObject({ kind: 'pickup', slipCode: 'SEDDEL005' })
    })

    it('udleverer når den rigtige pakke scannes, og gemmer tider', () => {
      const state = run(inBin(), scan('SEDDEL005', 2000), scan('PAKKE005', 9000))
      expect(state.parcels.PAKKE005).toMatchObject({ status: 'udleveret', deliveredAt: 9000 })
      expect(state.activity).toMatchObject({ kind: 'delivered', parcelCode: 'PAKKE005' })
      expect(state.stats.deliveryTimesMs).toEqual([7000])
    })

    it('afviser en forkert pakke, tæller den og venter fortsat', () => {
      const state = run(inBin(), scan('SEDDEL005', 2000), scan('PAKKE006', 3000))
      expect(state.activity).toMatchObject({
        kind: 'pickup',
        parcelCode: 'PAKKE005',
        wrongUntil: 6000,
      })
      expect(state.stats.wrongParcels).toBe(1)
      expect(state.parcels.PAKKE005.status).toBe('i biksen')
    })

    it('registrerer ikke en forkert pakke, der ikke er ankommet', () => {
      const state = run(inBin(), scan('SEDDEL005', 2000), scan('PAKKE006', 3000))
      expect(state.parcels.PAKKE006.status).toBe('ikke ankommet')
      expect(state.parcels.PAKKE006.registeredAt).toBeNull()
    })

    it('rører ikke en forkert pakke, der allerede er i biksen', () => {
      const start = run(inBin(), scan('PAKKE006', 1500))
      const state = run(start, scan('SEDDEL005', 2000), scan('PAKKE006', 3000))
      expect(state.parcels.PAKKE006).toEqual(start.parcels.PAKKE006)
    })

    it('fjerner den røde fejl efter tre sekunder, men venter fortsat', () => {
      const wrong = run(inBin(), scan('SEDDEL005', 2000), scan('PAKKE006', 3000))
      const later = posthusReducer(wrong, { type: 'TICK', now: 6000 })
      expect(later.activity).toMatchObject({ kind: 'pickup', wrongUntil: null })
    })

    it('fortsætter udleveringen, hvis samme seddel scannes igen', () => {
      const state = run(inBin(), scan('SEDDEL005', 2000), scan('SEDDEL005', 5000), scan('PAKKE005', 8000))
      expect(state.stats.deliveryTimesMs).toEqual([6000])
    })

    it('siger at pakken ikke er ankommet, og venter ikke på en pakke', () => {
      const state = run(createInitialState(), scan('SEDDEL007', 1000))
      expect(state.activity).toMatchObject({ kind: 'notArrived', slipCode: 'SEDDEL007' })
      // En pakke scannet bagefter er en almindelig indlevering.
      const after = run(state, scan('PAKKE007', 2000))
      expect(after.parcels.PAKKE007.status).toBe('i biksen')
    })

    it('siger at pakken allerede er udleveret, med tidspunkt', () => {
      const state = run(
        inBin(),
        scan('SEDDEL005', 2000),
        scan('PAKKE005', 3000),
        scan('SEDDEL005', 4000),
      )
      expect(state.activity).toMatchObject({
        kind: 'alreadyDelivered',
        slipCode: 'SEDDEL005',
        deliveredAt: 3000,
      })
    })

    it('afbryder med CANCEL uden at ændre pakken', () => {
      const state = run(inBin(), scan('SEDDEL005', 2000), { type: 'CANCEL' })
      expect(state.activity.kind).toBe('idle')
      expect(state.parcels.PAKKE005.status).toBe('i biksen')
    })

    it('afbryder ved at scanne en ny seddel', () => {
      const start = run(inBin(), scan('PAKKE006', 1500))
      const state = run(start, scan('SEDDEL005', 2000), scan('SEDDEL006', 3000))
      expect(state.activity).toMatchObject({ kind: 'pickup', slipCode: 'SEDDEL006' })
      const done = run(state, scan('PAKKE006', 4000))
      expect(done.parcels.PAKKE006.status).toBe('udleveret')
      expect(done.parcels.PAKKE005.status).toBe('i biksen')
    })
  })

  describe('instruktørpanel', () => {
    it('MESTER åbner og lukker panelet og påvirker ikke pakker', () => {
      const open = run(createInitialState(), scan('MESTER', 1000))
      expect(open.adminOpen).toBe(true)
      expect(open.activity.kind).toBe('idle')
      expect(run(open, scan('MESTER', 2000)).adminOpen).toBe(false)
    })

    it('ignorerer pakkescanninger mens panelet er åbent', () => {
      const state = run(createInitialState(), { type: 'OPEN_ADMIN' }, scan('PAKKE001', 1000))
      expect(state.parcels.PAKKE001.status).toBe('ikke ankommet')
    })

    it('registrerer pakker og springer allerede registrerede over', () => {
      const start = run(createInitialState(), scan('PAKKE001', 1000))
      const state = run(start, {
        type: 'REGISTER_PARCELS',
        codes: ['PAKKE001', 'PAKKE002'],
        now: 5000,
      })
      expect(state.parcels.PAKKE001.registeredAt).toBe(1000)
      expect(state.parcels.PAKKE002).toMatchObject({ status: 'i biksen', registeredAt: 5000 })
    })

    it('nulstiller pakker og statistik men holder panelet åbent', () => {
      const state = run(
        createInitialState(),
        scan('PAKKE001', 1000),
        scan('SEDDEL001', 2000),
        scan('PAKKE002', 3000),
        { type: 'OPEN_ADMIN' },
        { type: 'RESET' },
      )
      expect(state.adminOpen).toBe(true)
      expect(state.stats).toEqual({ wrongParcels: 0, deliveryTimesMs: [] })
      expect(registeredParcelsSorted(state.parcels)).toHaveLength(0)
    })
  })
})

describe('registeredParcelsSorted', () => {
  it('sætter pakker i biksen øverst, nyeste først', () => {
    const state = run(
      createInitialState(),
      scan('PAKKE001', 1000),
      scan('PAKKE002', 2000),
      scan('PAKKE003', 3000),
      scan('SEDDEL002', 4000),
      scan('PAKKE002', 5000),
    )
    expect(registeredParcelsSorted(state.parcels).map((p) => p.code)).toEqual([
      'PAKKE003',
      'PAKKE001',
      'PAKKE002',
    ])
  })
})

describe('pickRandomUnregistered', () => {
  it('vælger forskellige pakker der ikke er ankommet', () => {
    const start = run(createInitialState(), scan('PAKKE001', 1000))
    let seed = 0
    const random = () => (seed++ % 7) / 7
    const picked = pickRandomUnregistered(start.parcels, 10, random)
    expect(picked).toHaveLength(10)
    expect(new Set(picked).size).toBe(10)
    expect(picked).not.toContain('PAKKE001')
  })

  it('giver færre end ønsket, når der ikke er flere tilbage', () => {
    const start = createInitialState()
    expect(pickRandomUnregistered(start.parcels, 100, () => 0.99)).toHaveLength(40)
  })
})
