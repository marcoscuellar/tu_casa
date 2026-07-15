import { describe, expect, it } from 'vitest'
import { runAudit, type RecheckSignal } from './audit'
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

function audit(postings: RawPosting[], signals: Record<string, RecheckSignal>) {
  return runAudit(runDiscovery(postings), signals)
}

describe('Engine 3 — audit', () => {
  it('confirmed-dead is the only removal path', () => {
    const { survivors, dropped } = audit([raw({ id: 'dead' })], {
      dead: 'confirmed-dead',
    })
    expect(survivors).toHaveLength(0)
    expect(dropped).toHaveLength(1)
    expect(dropped[0].jobId).toBe('dead')
    expect(dropped[0].recheck).toBe('dead')
  })

  it('uncertain → FLAGGED, kept in the list, with a plain-language note', () => {
    const { survivors } = audit([raw({ id: 'maybe' })], { maybe: 'uncertain' })
    expect(survivors).toHaveLength(1) // never starves the list
    expect(survivors[0].audit.recheck).toBe('flagged')
    expect(survivors[0].audit.stillOpen).toBe('unknown')
    expect(survivors[0].audit.note).toBeTruthy()
    expect(survivors[0].confidence).toBe('flagged-verify')
  })

  it('confirmed-live → VERIFIED, shows clean', () => {
    const { survivors } = audit([raw({ id: 'live' })], { live: 'confirmed-live' })
    expect(survivors[0].audit.recheck).toBe('verified')
    expect(survivors[0].audit.stillOpen).toBe('yes')
    expect(survivors[0].confidence).toBe('verified')
  })

  it('defaults to FLAGGED when no signal is provided (doubt → downgrade, not drop)', () => {
    const { survivors, dropped } = audit([raw({ id: 'nosig' })], {})
    expect(dropped).toHaveLength(0)
    expect(survivors[0].audit.recheck).toBe('flagged')
  })

  it('dedupes the same job across sources, keeping the strongest (company/ATS)', () => {
    const { survivors, duplicates } = audit(
      [
        raw({ id: 'ats', sourceType: 'company-ats' }),
        raw({ id: 'agg', sourceType: 'aggregator-only' }),
      ],
      { ats: 'confirmed-live', agg: 'confirmed-live' },
    )
    expect(survivors).toHaveLength(1)
    expect(survivors[0].id).toBe('ats') // company/ATS survived
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].jobId).toBe('agg')
    expect(duplicates[0].duplicateOf).toBe('ats')
  })

  it('a flagged job and a verified job both reach the candidate', () => {
    const { survivors } = audit(
      [
        raw({ id: 'v', company: 'A', role: 'R1' }),
        raw({ id: 'f', company: 'B', role: 'R2' }),
      ],
      { v: 'confirmed-live', f: 'uncertain' },
    )
    expect(survivors.map((s) => s.id).sort()).toEqual(['f', 'v'])
  })
})

describe('Engine 3 — stronger dedupe (company + title + location + description)', () => {
  it('collapses one role posted across many boards into a single survivor + group', () => {
    const { survivors, duplicates } = audit(
      [
        raw({ id: 'ats', sourceType: 'company-ats', link: 'https://boards.greenhouse.io/acme/1' }),
        raw({ id: 'li', sourceType: 'aggregator-only', link: 'https://www.linkedin.com/jobs/1' }),
        raw({ id: 'zip', sourceType: 'aggregator-only', link: 'https://ziprecruiter.com/j/1' }),
        raw({ id: 'ind', sourceType: 'aggregator-only', link: 'https://indeed.com/viewjob?jk=1' }),
      ],
      {},
    )
    expect(survivors).toHaveLength(1)
    expect(survivors[0].id).toBe('ats') // authoritative source wins
    expect(duplicates).toHaveLength(3)
    // The survivor carries the "also posted on N other sites" group.
    expect(survivors[0].alsoPostedOn?.map((d) => d.label).sort()).toEqual([
      'indeed.com',
      'linkedin.com',
      'ziprecruiter.com',
    ])
  })

  it('keeps the same role in different cities as separate jobs', () => {
    const { survivors } = audit(
      [
        raw({ id: 'sf', remote: false, location: 'San Francisco, CA' }),
        raw({ id: 'ny', remote: false, location: 'New York, NY' }),
      ],
      {},
    )
    expect(survivors.map((s) => s.id).sort()).toEqual(['ny', 'sf'])
  })

  it('normalizes "Sr." → "Senior" so title variants of one job collapse', () => {
    const { survivors } = audit(
      [
        raw({ id: 'a', role: 'Senior Software Engineer', sourceType: 'company-ats' }),
        raw({ id: 'b', role: 'Sr. Software Engineer', sourceType: 'aggregator-only' }),
      ],
      {},
    )
    expect(survivors).toHaveLength(1)
    expect(survivors[0].id).toBe('a')
  })

  it('does NOT merge two distinct reqs that only share company+title+location', () => {
    const { survivors } = audit(
      [
        raw({ id: 'growth', description: 'Growth marketing analytics dashboards experimentation reporting funnels.' }),
        raw({ id: 'platform', description: 'Payment ledger infrastructure latency services reliability throughput.' }),
      ],
      {},
    )
    expect(survivors.map((s) => s.id).sort()).toEqual(['growth', 'platform'])
  })

  it('prefers the richer description when the source ties', () => {
    const { survivors } = audit(
      [
        raw({ id: 'thin', sourceType: 'aggregator-only', description: 'React TypeScript design system with ownership.' }),
        raw({ id: 'rich', sourceType: 'aggregator-only', description: 'React TypeScript design system with ownership and mentoring.' }),
      ],
      {},
    )
    expect(survivors).toHaveLength(1)
    expect(survivors[0].id).toBe('rich')
  })

  it('prefers the newest posting when source + description richness tie', () => {
    const { survivors } = audit(
      [
        raw({ id: 'old', sourceType: 'aggregator-only', postedDate: '2026-01-01', description: 'Same posting body here.' }),
        raw({ id: 'new', sourceType: 'aggregator-only', postedDate: '2026-05-01', description: 'Same posting body here.' }),
      ],
      {},
    )
    expect(survivors[0].id).toBe('new')
  })
})
