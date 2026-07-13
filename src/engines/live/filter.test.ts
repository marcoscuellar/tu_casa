import { describe, expect, it } from 'vitest'
import { isRelevant } from './filter'
import { inferFamily, inferLevel } from '../taxonomy'
import type { ParsedResume } from '../types'
import type { NormalizedPosting } from './ats/types'

/**
 * Relevance filter across role types — the fix for "2096 matches": a résumé that
 * classifies as a non-engineering family (or doesn't classify at all) must NOT
 * match every unclassifiable posting. Family is the gate; title-word overlap is
 * the fallback for niche roles.
 */

const résumé = (title: string, over: Partial<ParsedResume> = {}): ParsedResume => ({
  titles: [{ raw: title, family: inferFamily(title), level: inferLevel(title) }],
  skills: [],
  years_total: 8,
  industries: [],
  certs_clearances: [],
  location: 'Remote',
  onsite_ok: true,
  ...over,
})

const posting = (role: string): NormalizedPosting => ({
  externalId: role,
  company: 'Acme',
  role,
  location: 'Remote',
  remote: true,
  url: 'https://x/1',
  postedDate: 'Apr 2026',
  descriptionText: role,
})

describe('isRelevant — role-family gate, no "other" wildcard', () => {
  const sales = résumé('Director of Sales and Go To Market Manager')

  it('classifies a sales/GTM title as sales, not other', () => {
    expect(sales.titles[0].family).toBe('sales')
  })

  it('does NOT surface engineering roles for a sales résumé', () => {
    expect(isRelevant(sales, posting('Engineering Manager'))).toBe(false)
    expect(isRelevant(sales, posting('Staff Software Engineer'))).toBe(false)
    expect(isRelevant(sales, posting('Manager, Solutions Architect'))).toBe(false)
  })

  it('surfaces sales and adjacent GTM roles', () => {
    expect(isRelevant(sales, posting('Account Executive, Enterprise'))).toBe(true)
    expect(isRelevant(sales, posting('Product Marketing Manager'))).toBe(true) // marketing ~ sales
  })

  it('two unclassifiable roles do not match unless the titles overlap', () => {
    const nurse = résumé('Registered Nurse')
    expect(nurse.titles[0].family).toBe('other')
    // other ≠ other: an eng role shares no distinctive word → dropped
    expect(isRelevant(nurse, posting('Engineering Manager'))).toBe(false)
    // but a genuinely-related role still matches via title-word overlap
    expect(isRelevant(nurse, posting('Nurse Practitioner'))).toBe(true)
  })
})
