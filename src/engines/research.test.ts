import { describe, expect, it } from 'vitest'
import { gateResearch } from './research'
import type { ResearchBrief } from './types'

const brief = (over: Partial<ResearchBrief> = {}): ResearchBrief => ({
  companyOneLiner: 'Acme builds widgets for small businesses.',
  signals: [
    { signal: 'Raised Series B', source: 'TechCrunch', date: 'Feb 2026', youCouldSay: '…' },
    { signal: 'Launched v2', source: 'Blog', date: 'Mar 2026', youCouldSay: '…' },
  ],
  statedPriorities: [{ priority: 'Reliability', howToUse: '…' }],
  likelyThemes: ['System design', 'Ownership'],
  readiness: 'GO',
  ...over,
})

describe('Interview research — THIN/GO gate', () => {
  it('GO with a confirmed snapshot + 2 sourced, dated signals', () => {
    expect(gateResearch(brief()).readiness).toBe('GO')
  })

  it('THIN with fewer than 2 signals', () => {
    const g = gateResearch(
      brief({
        signals: [
          { signal: 'One thing', source: 'Blog', date: 'Mar 2026', youCouldSay: '…' },
        ],
      }),
    )
    expect(g.readiness).toBe('THIN')
  })

  it('drops a signal missing a source or date, then re-evaluates to THIN', () => {
    const g = gateResearch(
      brief({
        signals: [
          { signal: 'Sourced', source: 'TechCrunch', date: 'Feb 2026', youCouldSay: '…' },
          { signal: 'No date', source: 'Blog', date: '', youCouldSay: '…' },
        ],
      }),
    )
    expect(g.brief.signals).toHaveLength(1) // dateless signal removed
    expect(g.readiness).toBe('THIN')
  })

  it('THIN with no confirmable snapshot', () => {
    expect(gateResearch(brief({ companyOneLiner: '  ' })).readiness).toBe('THIN')
  })

  it('THIN still keeps role-based prep (likelyThemes survive)', () => {
    const g = gateResearch(brief({ signals: [], companyOneLiner: '' }))
    expect(g.readiness).toBe('THIN')
    expect(g.brief.likelyThemes.length).toBeGreaterThan(0)
  })
})
