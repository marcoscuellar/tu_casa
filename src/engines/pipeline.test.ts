import { beforeAll, describe, expect, it } from 'vitest'
import {
  buildHiringInsight,
  buildResearch,
  diversifyByCompany,
  runPipeline,
  type PipelineResult,
} from './pipeline'
import { fixtureProviders } from './providers/fixtures'
import { groundableRefs } from './reasoning'
import type { RankedJob } from './types'

// Pin the reference year so the fixtures' recency scoring is deterministic.
const AS_OF = 2026

describe('pipeline — discover → audit → score → rank (fixtures)', () => {
  let result: PipelineResult
  beforeAll(async () => {
    result = await runPipeline(fixtureProviders, { asOfYear: AS_OF })
  })

  it('collapses the duplicate posting and drops the confirmed-dead one', () => {
    // 6 raw postings → 1 duplicate collapsed, 1 dead dropped → 4 survivors.
    expect(result.jobs).toHaveLength(4)
    expect(result.duplicateCount).toBe(1)
    expect(result.droppedCount).toBe(1)
    const ids = result.jobs.map((j) => j.id)
    expect(ids).not.toContain('northwind-sfe-indeed') // duplicate gone
    expect(ids).not.toContain('willow-fe') // confirmed-dead gone
  })

  it('keeps the Northwind ATS listing (not its aggregator duplicate)', () => {
    const northwind = result.jobs.find((j) => j.company === 'Northwind Apparel')
    expect(northwind?.id).toBe('northwind-sfe')
    expect(northwind?.confidence).toBe('verified')
  })

  it('surfaces the flagged Cedar & Oak job, not hidden, with a verify note', () => {
    const cedar = result.jobs.find((j) => j.company === 'Cedar & Oak')
    expect(cedar).toBeDefined()
    expect(cedar?.audit.recheck).toBe('flagged')
    expect(cedar?.confidence).toBe('flagged-verify')
    expect(cedar?.audit.note).toBeTruthy()
  })

  it('scores every survivor with the real rubric (earned, not hand-written)', () => {
    for (const job of result.jobs) {
      expect(job.fit.score).toBeGreaterThanOrEqual(0)
      expect(job.fit.score).toBeLessThanOrEqual(100)
      expect(['STRONG', 'PARTIAL', 'WEAK', 'NO_GO']).toContain(job.fit.verdict)
    }
  })

  it('ranks by earned fit, with location factored into the order', () => {
    // Northwind (remote, cleanest match) tops the list.
    expect(result.jobs[0].company).toBe('Northwind Apparel')
    // Ranking is by effective score (fit − location penalty), so a far HYBRID
    // role is downgraded even with a strong fit: the Loomly "Hybrid NYC" posting
    // carries a location note and never tops a remote-preferring candidate's list.
    const loomly = result.jobs.find((j) => j.company === 'Loomly')
    expect(loomly?.locationNote).toBeTruthy()
    expect(result.jobs.indexOf(loomly!)).toBeGreaterThan(0)
  })

  it('Brightline lands PARTIAL with Kubernetes named as the gap', () => {
    const bright = result.jobs.find((j) => j.company === 'Brightline')
    expect(bright?.fit.verdict).toBe('PARTIAL')
    expect(bright?.fit.gaps.some((g) => /kubernetes/i.test(g.t))).toBe(true)
  })

  it('research gate returns GO for Northwind and THIN for an unknown company', () => {
    expect(buildResearch(fixtureProviders, 'Northwind Apparel', 'SFE').readiness).toBe('GO')
    expect(buildResearch(fixtureProviders, 'Obscure Co', 'SFE').readiness).toBe('THIN')
  })

  it('reasons a grounded "why" for Northwind (GO), every item tied to a real signal', () => {
    const gated = buildResearch(fixtureProviders, 'Northwind Apparel', 'Senior Frontend Engineer')
    const insight = buildHiringInsight(fixtureProviders, gated, 'Senior Frontend Engineer')!
    expect(insight).not.toBeNull()
    expect(insight.why).toMatch(/Series C|replatform|app/i)
    const refs = groundableRefs(gated.brief)
    for (const t of insight.talkingPoints) {
      expect(t.sources.every((s) => refs.has(s))).toBe(true)
    }
    for (const q of insight.likelyQuestions) {
      expect(q.sources.every((s) => refs.has(s))).toBe(true)
    }
  })

  it('reasons NO "why" for a THIN company (no signal → no invented motive)', () => {
    const gated = buildResearch(fixtureProviders, 'Brightline', 'Senior Software Engineer')
    expect(gated.readiness).toBe('THIN')
    expect(buildHiringInsight(fixtureProviders, gated, 'Senior Software Engineer')).toBeNull()
  })
})

describe('diversifyByCompany', () => {
  const job = (id: string, company: string) => ({ id, company }) as unknown as RankedJob

  it('caps a flooding company and defers extras to the overflow tail', () => {
    const ranked = [
      job('a1', 'Stripe'),
      job('a2', 'Stripe'),
      job('a3', 'Stripe'), // 3rd Stripe → overflow
      job('b1', 'Figma'),
      job('a4', 'Stripe'), // 4th Stripe → overflow
      job('c1', 'Linear'),
    ]
    // First two Stripe roles hold their spots; 3rd/4th drop to the tail, in order.
    expect(diversifyByCompany(ranked, 2).map((j) => j.id)).toEqual([
      'a1', 'a2', 'b1', 'c1', 'a3', 'a4',
    ])
  })

  it('is a no-op when every company is within the cap', () => {
    const ranked = [job('a1', 'Stripe'), job('b1', 'Figma'), job('a2', 'Stripe')]
    expect(diversifyByCompany(ranked, 2).map((j) => j.id)).toEqual(['a1', 'b1', 'a2'])
  })
})
