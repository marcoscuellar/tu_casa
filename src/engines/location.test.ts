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

describe('locationFit — downgrade, don\'t drop', () => {
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

  it('onsite role in the candidate’s own city → full fit, no penalty', () => {
    const fit = locationFit(resume({ location: 'San Francisco, CA' }), onsiteSF)
    expect(fit.include).toBe(true)
    expect(fit.penalty).toBe(0)
  })

  it('onsite role in another city, candidate willing → included but lower', () => {
    const fit = locationFit(
      resume({ location: 'Austin, TX', onsite_ok: true }),
      onsiteSF,
    )
    expect(fit.include).toBe(true)
    expect(fit.penalty).toBeGreaterThan(0)
  })
})
