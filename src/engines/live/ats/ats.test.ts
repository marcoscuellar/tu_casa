import { describe, expect, it } from 'vitest'
import { fetchGreenhouse } from './greenhouse'
import { fetchLever } from './lever'
import { fetchAshby } from './ashby'
import { htmlToText, type JsonFetcher } from './types'

/** Recorded-shape responses (schema-accurate to each vendor's public API). */
const GH = {
  jobs: [
    {
      id: 101,
      title: 'Senior Frontend Engineer',
      updated_at: '2026-05-01T00:00:00.000Z',
      location: { name: 'Remote - US' },
      content: '&lt;p&gt;Build with React &amp;amp; TypeScript. 5+ years.&lt;/p&gt;',
      absolute_url: 'https://boards.greenhouse.io/acme/jobs/101',
    },
  ],
}
const LEVER = [
  {
    id: 'abc-123',
    text: 'Staff Web Engineer',
    categories: { location: 'San Francisco', team: 'Engineering' },
    descriptionPlain: 'Lead React apps.',
    lists: [{ text: 'Requirements', content: '<ul><li>6+ years</li><li>Node.js</li></ul>' }],
    hostedUrl: 'https://jobs.lever.co/beta/abc-123',
    createdAt: 1746057600000,
    workplaceType: 'remote',
    salaryRange: { min: 165000, max: 190000, currency: 'USD' },
  },
]
const ASHBY = {
  jobs: [
    {
      id: 'xyz-9',
      title: 'Frontend Lead',
      location: 'Remote, US',
      isRemote: true,
      isListed: true,
      descriptionPlain: 'Own the frontend. 7+ years React, Next.js.',
      publishedAt: '2026-04-01T00:00:00.000Z',
      jobUrl: 'https://jobs.ashbyhq.com/gamma/xyz-9',
      compensation: { compensationTierSummary: '$150K – $175K' },
    },
    { id: 'hidden', title: 'Unlisted', isListed: false, location: 'Remote' },
  ],
}

const fetcherFor = (payload: unknown): JsonFetcher => async () => payload

describe('ATS normalizers', () => {
  it('htmlToText decodes entities (incl. double-encoded) and strips tags', () => {
    expect(htmlToText('&lt;p&gt;A &amp;amp; B&lt;/p&gt;')).toContain('A & B')
  })

  it('Greenhouse → normalized posting', async () => {
    const [p] = await fetchGreenhouse('Acme', 'acme', fetcherFor(GH))
    expect(p.company).toBe('Acme')
    expect(p.role).toBe('Senior Frontend Engineer')
    expect(p.remote).toBe(true)
    expect(p.postedDate).toBe('May 2026')
    expect(p.url).toContain('greenhouse.io')
    expect(p.descriptionText).toMatch(/React & TypeScript/)
    expect(p.externalId).toBe('101')
  })

  it('Lever → normalized posting (salary, remote flag, lists merged)', async () => {
    const [p] = await fetchLever('Beta', 'beta', fetcherFor(LEVER))
    expect(p.role).toBe('Staff Web Engineer')
    expect(p.remote).toBe(true)
    expect(p.salary).toBe('$165k–$190k')
    expect(p.descriptionText).toMatch(/Node\.js/)
  })

  it('Ashby → normalized posting, drops unlisted jobs', async () => {
    const out = await fetchAshby('Gamma', 'gamma', fetcherFor(ASHBY))
    expect(out).toHaveLength(1) // "hidden" (isListed:false) removed
    expect(out[0].role).toBe('Frontend Lead')
    expect(out[0].salary).toBe('$150K – $175K')
    expect(out[0].postedDate).toBe('Apr 2026')
  })

  it('a rejected fetch propagates (caller decides to skip)', async () => {
    const boom: JsonFetcher = async () => {
      throw new Error('HTTP 404')
    }
    await expect(fetchGreenhouse('X', 'nope', boom)).rejects.toThrow('404')
  })
})
