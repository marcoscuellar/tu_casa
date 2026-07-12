import { describe, expect, it } from 'vitest'
import { runPipeline } from '../pipeline'
import { createLiveProviders } from '../providers/live'
import { SAMPLE_RESUME } from '../providers/fixtures'
import type { LiveDiscoveryOptions } from './liveDiscovery'
import type { CompanySourceProvider } from './companySource'
import { greenhouseUrl } from './ats/greenhouse'
import { leverUrl } from './ats/lever'
import { ashbyUrl } from './ats/ashby'
import type { JsonFetcher } from './ats/types'

/**
 * Full live path on recorded-shape ATS payloads. This is the offline proof that
 * real postings flow end-to-end: fetch → normalize → résumé filter → Engine 4 →
 * Engine 3 → rubric → rank. (Live network is blocked in the build sandbox; the
 * same code hits real boards when egress is open.)
 */

const GH = {
  jobs: [
    {
      id: 1,
      title: 'Senior Frontend Engineer',
      updated_at: '2026-05-01T00:00:00Z',
      location: { name: 'Remote - US' },
      content:
        '&lt;p&gt;Requirements: 5+ years with React, TypeScript, Shopify Hydrogen and design systems.&lt;/p&gt;',
      absolute_url: 'https://boards.greenhouse.io/acme/jobs/1',
    },
    {
      id: 2,
      title: 'Sales Manager', // non-engineering → filtered out by role family
      updated_at: '2026-05-01T00:00:00Z',
      location: { name: 'Remote - US' },
      content: '&lt;p&gt;5+ years of quota-carrying sales management.&lt;/p&gt;',
      absolute_url: 'https://boards.greenhouse.io/acme/jobs/2',
    },
  ],
}
const LEVER = [
  {
    id: 'l1',
    text: 'Staff Web Engineer',
    categories: { location: 'Remote' },
    descriptionPlain: 'Requirements: 6+ years React, TypeScript, Node.js.',
    hostedUrl: 'https://jobs.lever.co/beta/l1',
    createdAt: 1746057600000,
    workplaceType: 'remote',
    salaryRange: { min: 165000, max: 190000 },
  },
]
const ASHBY = {
  jobs: [
    {
      id: 'a1',
      title: 'Frontend Lead',
      location: 'Remote, US',
      isRemote: true,
      descriptionPlain: 'Requirements: 6+ years React and Next.js.',
      publishedAt: '2026-04-01T00:00:00Z',
      jobUrl: 'https://jobs.ashbyhq.com/gamma/a1',
      compensation: { compensationTierSummary: '$150K – $175K' },
    },
    {
      id: 'a2',
      title: 'Fullstack Engineer', // adjacent family, but ONSITE → filtered by location
      location: 'New York, NY',
      isRemote: false,
      descriptionPlain: 'Requirements: 5+ years React and Node.js.',
      publishedAt: '2026-04-01T00:00:00Z',
      jobUrl: 'https://jobs.ashbyhq.com/gamma/a2',
    },
  ],
}

const companySource: CompanySourceProvider = {
  companiesFor: () => [
    { name: 'Acme', ats: 'greenhouse', slug: 'acme' },
    { name: 'Beta', ats: 'lever', slug: 'beta' },
    { name: 'Gamma', ats: 'ashby', slug: 'gamma' },
  ],
}

const routes: Record<string, unknown> = {
  [greenhouseUrl('acme')]: GH,
  [leverUrl('beta')]: LEVER,
  [ashbyUrl('gamma')]: ASHBY,
}
const fetchJson: JsonFetcher = async (url) => {
  if (url in routes) return routes[url]
  throw new Error(`HTTP 404 ${url}`)
}

// These tests exercise discovery, so use the fixture résumé (Maya) rather than
// the live Claude parser.
const liveProviders = (opts: LiveDiscoveryOptions) => ({
  ...createLiveProviders(opts),
  resume: { parseResume: async () => SAMPLE_RESUME },
})

describe('live discovery — full pipeline on recorded ATS payloads', () => {
  it('returns real, filtered, scored, ranked jobs', async () => {
    const providers = liveProviders({ companySource, fetchJson })
    const result = await runPipeline(providers, { asOfYear: 2026 })

    // Evidence: print the actual jobs that came back.
    console.log(
      '\nLive pipeline (recorded samples) →',
      result.jobs.map((j) => `${j.fit.score} ${j.role} · ${j.company} [${j.confidence}]`),
    )

    // Sales dropped (wrong family). The onsite Fullstack role is now KEPT but
    // downgraded (Maya is onsite_ok) → 4 jobs, not 3.
    expect(result.jobs).toHaveLength(4)
    expect(result.jobs.some((j) => j.role === 'Sales Manager')).toBe(false)
    const fullstack = result.jobs.find((j) => j.role === 'Fullstack Engineer')
    expect(fullstack).toBeDefined() // onsite role surfaced…
    expect(fullstack?.locationNote).toBeTruthy() // …with the "ranked lower" note
  })

  it('scores each with the real rubric and ranks strongest first', async () => {
    const providers = liveProviders({ companySource, fetchJson })
    const result = await runPipeline(providers, { asOfYear: 2026 })
    const scores = result.jobs.map((j) => j.fit.score)
    expect([...scores]).toEqual([...scores].sort((a, b) => b - a))
    // The Northwind-style SFE with the fullest skill overlap tops the list.
    expect(result.jobs[0].role).toBe('Senior Frontend Engineer')
    expect(result.jobs[0].fit.verdict).toMatch(/STRONG|PARTIAL/)
    // ids are ATS-prefixed and unique
    expect(new Set(result.jobs.map((j) => j.id)).size).toBe(4)
    expect(result.jobs[0].id.startsWith('greenhouse:')).toBe(true)
  })

  it('downgrades an onsite role below an equal-scoring remote one (not dropped)', async () => {
    // Same role at two companies — one remote, one onsite Austin (distinct so
    // Engine 3 doesn't dedupe them). Maya is remote-preferred but onsite_ok, so
    // both surface; the remote one wins on rank despite an identical fit score.
    const desc = 'Requirements: 5+ years React, TypeScript, design systems.'
    const board = (id: string, remote: boolean, location: string) => ({
      jobs: [
        {
          id,
          title: 'Senior Frontend Engineer',
          location,
          isRemote: remote,
          descriptionPlain: desc,
          jobUrl: `https://jobs.ashbyhq.com/${id}/1`,
          publishedAt: '2026-04-01T00:00:00Z',
        },
      ],
    })
    const src: CompanySourceProvider = {
      companiesFor: () => [
        { name: 'Delta', ats: 'ashby', slug: 'delta' },
        { name: 'Echo', ats: 'ashby', slug: 'echo' },
      ],
    }
    const fetch2: JsonFetcher = async (url) => {
      if (url === ashbyUrl('delta')) return board('delta', true, 'Remote, US')
      if (url === ashbyUrl('echo')) return board('echo', false, 'Austin, TX')
      throw new Error('404')
    }
    const result = await runPipeline(
      liveProviders({ companySource: src, fetchJson: fetch2 }),
      { asOfYear: 2026 },
    )

    expect(result.jobs).toHaveLength(2) // both kept — onsite NOT dropped
    const remote = result.jobs.find((j) => j.remote)!
    const onsite = result.jobs.find((j) => !j.remote)!
    expect(result.jobs[0].id).toBe(remote.id) // remote ranks first
    expect(remote.fit.score).toBe(onsite.fit.score) // same pure fit score
    expect(onsite.locationNote).toBeTruthy() // onsite carries the plain note
    expect(remote.locationNote).toBeUndefined()
  })

  it('skips boards that fail without aborting the run', async () => {
    const flaky: CompanySourceProvider = {
      companiesFor: () => [
        { name: 'Acme', ats: 'greenhouse', slug: 'acme' },
        { name: 'Dead', ats: 'greenhouse', slug: 'does-not-exist' },
      ],
    }
    const skipped: string[] = []
    const providers = liveProviders({
      companySource: flaky,
      fetchJson,
      onSkip: (c) => skipped.push(c.name),
    })
    const result = await runPipeline(providers, { asOfYear: 2026 })
    expect(skipped).toEqual(['Dead'])
    expect(result.jobs.length).toBeGreaterThan(0) // Acme still came through
  })
})
