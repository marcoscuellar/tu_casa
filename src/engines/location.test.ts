import { describe, expect, it } from 'vitest'
import { locationFit } from './location'
import type { ParsedResume } from './types'

const resume = (over: Partial<ParsedResume>): ParsedResume => ({
  titles: [{ raw: 'Senior Frontend Engineer', family: 'frontend', level: 'senior' }],
  skills: [],
  years_total: 8,
  industries: [],
  certs_clearances: [],
  location: 'Remote',
  onsite_ok: true,
  ...over,
})

const remoteJob = { remote: true, location: 'Remote - US' }
const onsiteSF = { remote: false, location: 'San Francisco, CA • New York, NY' }

describe('locationFit — proximity-tiered, downgrade don\'t drop', () => {
  it('remote role: everyone, no penalty', () => {
    expect(locationFit(resume({ onsite_ok: false }), remoteJob)).toEqual({
      include: true,
      penalty: 0,
    })
  })

  it('onsite role + remote-preferred but onsite-willing → included, penalized, noted', () => {
    const fit = locationFit(resume({ location: 'Remote', onsite_ok: true }), onsiteSF)
    expect(fit.include).toBe(true)
    expect(fit.penalty).toBeGreaterThan(0)
    expect(fit.note).toBeTruthy()
  })

  it('onsite role + remote-ONLY → excluded (the one real exclusion)', () => {
    const fit = locationFit(resume({ location: 'Remote', onsite_ok: false }), onsiteSF)
    expect(fit.include).toBe(false)
    expect(fit.penalty).toBe(0)
  })

  it('onsite role in your own city → floats to the top (boost, above remote)', () => {
    const local = locationFit(resume({ location: 'San Francisco, CA' }), onsiteSF)
    const remote = locationFit(resume({ location: 'San Francisco, CA' }), remoteJob)
    expect(local.include).toBe(true)
    expect(local.penalty).toBeLessThan(remote.penalty) // local ranks above remote
  })

  it('onsite role in another city, candidate willing → included but ranked lower', () => {
    const fit = locationFit(resume({ location: 'Austin, TX', onsite_ok: true }), onsiteSF)
    expect(fit.include).toBe(true)
    expect(fit.penalty).toBeGreaterThan(0)
  })

  // --- hybrid: proximity-bound, so it's judged like onsite, not remote ---

  it('hybrid in your city → included, close-to-home note', () => {
    const fit = locationFit(
      resume({ location: 'Austin, TX' }),
      { remote: true, location: 'Hybrid — Austin, TX' }, // board flags remote, but it's hybrid
    )
    expect(fit.include).toBe(true)
    expect(fit.penalty).toBeLessThanOrEqual(0)
    expect(fit.note).toMatch(/hybrid/i)
  })

  it('hybrid far away + remote-ONLY → excluded (can’t commute)', () => {
    const fit = locationFit(
      resume({ location: 'Remote', onsite_ok: false }),
      { remote: true, location: 'Hybrid — San Francisco, CA' },
    )
    expect(fit.include).toBe(false)
  })

  it('hybrid far away + onsite-willing → kept but heavily downgraded, noted', () => {
    const fit = locationFit(
      resume({ location: 'Austin, TX', onsite_ok: true }),
      { remote: false, location: 'Hybrid — San Francisco, CA' },
    )
    expect(fit.include).toBe(true)
    expect(fit.penalty).toBeGreaterThan(0)
    expect(fit.note).toMatch(/onsite there regularly/i)
  })
})
