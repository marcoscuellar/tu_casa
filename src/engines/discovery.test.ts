import { describe, expect, it } from 'vitest'
import { runDiscovery, type RawPosting } from './discovery'
import type { ParsedJD } from './types'

const jd: ParsedJD = {
  title: { family: 'frontend', level: 'senior' },
  hard_required_skills: [],
  preferred_skills: [],
  min_years_total: 0,
  dealbreakers: [],
}

const raw = (over: Partial<RawPosting>): RawPosting => ({
  id: 'x',
  company: 'Acme',
  role: 'Engineer',
  location: 'Remote',
  remote: true,
  link: 'https://acme.example/jobs/1',
  postedDate: 'May 2026',
  sourceType: 'company-ats',
  livenessEvidence: 'confirmed-open',
  jd,
  ...over,
})

describe('Engine 4 — discovery classification', () => {
  it('company/ATS source is verified on that alone', () => {
    const [d] = runDiscovery([raw({ sourceType: 'company-ats' })])
    expect(d.confidence).toBe('verified')
    expect(d.note).toBeUndefined()
  })

  it('aggregator-corroborated → likely', () => {
    const [d] = runDiscovery([raw({ sourceType: 'aggregator-corroborated' })])
    expect(d.confidence).toBe('likely')
  })

  it('aggregator-only → flagged-verify with a plain note, never dropped', () => {
    const out = runDiscovery([raw({ sourceType: 'aggregator-only' })])
    expect(out).toHaveLength(1) // nothing dropped
    expect(out[0].confidence).toBe('flagged-verify')
    expect(out[0].note).toMatch(/company site/i)
  })

  it('liveness beats freshness: an old posting is NOT downgraded for age', () => {
    const [d] = runDiscovery([
      raw({ sourceType: 'company-ats', postedDate: 'Jan 2023' }),
    ])
    expect(d.confidence).toBe('verified') // age didn't matter
  })

  it('status is never "closed" unless confirmed', () => {
    expect(runDiscovery([raw({ livenessEvidence: 'none' })])[0].status).toBe('unknown')
    expect(runDiscovery([raw({ livenessEvidence: 'confirmed-open' })])[0].status).toBe('open')
    expect(
      runDiscovery([raw({ livenessEvidence: 'confirmed-closed' })])[0].status,
    ).toBe('closed')
  })

  it('drops nothing — discovery is total', () => {
    const out = runDiscovery([
      raw({ id: 'a', sourceType: 'company-ats' }),
      raw({ id: 'b', sourceType: 'aggregator-only' }),
      raw({ id: 'c', livenessEvidence: 'confirmed-closed' }),
    ])
    expect(out).toHaveLength(3)
  })
})
