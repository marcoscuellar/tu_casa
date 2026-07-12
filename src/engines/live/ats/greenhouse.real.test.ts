import { describe, expect, it } from 'vitest'
import figma from './__fixtures__/figma.sample.json'
import { fetchGreenhouse } from './greenhouse'
import type { JsonFetcher } from './types'
import { isRelevant } from '../filter'
import type { ParsedResume } from '../../types'

/**
 * Normalizer validated against a REAL Greenhouse board response (a trimmed
 * subset of Figma's live board). Proves the parser + filter handle genuine
 * data: entity-encoded HTML content, multi-city locations, real dates/URLs.
 */

const fetchJson: JsonFetcher = async () => figma

const resume = (over: Partial<ParsedResume>): ParsedResume => ({
  titles: [{ raw: 'Senior Software Engineer', family: 'fullstack', level: 'senior' }],
  skills: [
    { canonical: 'typescript', years: 7, last_used_year: 2026 },
    { canonical: 'react', years: 7, last_used_year: 2026 },
  ],
  years_total: 8,
  industries: [],
  certs_clearances: [],
  location: 'San Francisco, CA',
  onsite_ok: true,
  ...over,
})

describe('Greenhouse normalizer — real Figma board', () => {
  it('normalizes every real posting with content, url, and date', async () => {
    const out = await fetchGreenhouse('Figma', 'figma', fetchJson)
    expect(out.length).toBe(figma.jobs.length)
    for (const p of out) {
      expect(p.company).toBe('Figma')
      expect(p.role.length).toBeGreaterThan(0)
      expect(p.url.startsWith('http')).toBe(true)
      expect(p.postedDate).toMatch(/^[A-Z][a-z]{2} \d{4}$/) // "Apr 2026"
      expect(p.descriptionText.length).toBeGreaterThan(20)
    }
  })

  it('decodes entity-encoded HTML content to clean text', async () => {
    const out = await fetchGreenhouse('Figma', 'figma', fetchJson)
    for (const p of out) {
      expect(p.descriptionText).not.toMatch(/&lt;|&gt;|&quot;|&amp;/) // fully decoded
      expect(p.descriptionText).not.toMatch(/<[a-z][^>]*>/i) // tags stripped
    }
  })

  it('preserves real multi-city location strings', async () => {
    const out = await fetchGreenhouse('Figma', 'figma', fetchJson)
    const fullStack = out.find((p) => p.role === 'Software Engineer, Full Stack')
    expect(fullStack?.location).toContain('San Francisco')
    expect(fullStack?.remote).toBe(false) // Figma roles are onsite
  })

  it('filter keeps engineering roles, drops non-engineering (family is a hard gate)', async () => {
    const out = await fetchGreenhouse('Figma', 'figma', fetchJson)
    const sf = resume({})
    const relevant = out.filter((p) => isRelevant(sf, p)).map((p) => p.role)
    expect(relevant).toContain('Software Engineer, Full Stack')
    expect(relevant).not.toContain('Account Executive, Enterprise') // wrong family
    expect(relevant).not.toContain('Data Engineer') // data family ≠ fullstack
  })

  it('an onsite-willing remote candidate now SEES Figma roles (downgraded, not dropped)', async () => {
    const out = await fetchGreenhouse('Figma', 'figma', fetchJson)
    // Remote-preferred but open to onsite → onsite engineering roles surface.
    const onsiteWilling = resume({ location: 'Remote', onsite_ok: true })
    const relevant = out.filter((p) => isRelevant(onsiteWilling, p)).map((p) => p.role)
    expect(relevant).toContain('Software Engineer, Full Stack')
  })

  it('a remote-ONLY candidate still matches nothing onsite (exclusion stays)', async () => {
    const out = await fetchGreenhouse('Figma', 'figma', fetchJson)
    const remoteOnly = resume({ location: 'Remote', onsite_ok: false })
    expect(out.filter((p) => isRelevant(remoteOnly, p))).toHaveLength(0)
  })
})
