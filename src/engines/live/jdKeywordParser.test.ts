import { describe, expect, it } from 'vitest'
import { parseJDText } from './jdKeywordParser'

const JD = `We're hiring a Senior Frontend Engineer.

Requirements:
- 5+ years building web apps with React and TypeScript
- Experience with Shopify Hydrogen and design systems

Nice to have:
- GraphQL and Next.js experience`

describe('keyword JD parser', () => {
  const jd = parseJDText('Senior Frontend Engineer', JD)

  it('infers family + level from the title', () => {
    expect(jd.title.family).toBe('frontend')
    expect(jd.title.level).toBe('senior')
  })

  it('extracts hard-required skills from the requirements section', () => {
    const hard = jd.hard_required_skills.map((s) => s.canonical).sort()
    expect(hard).toContain('react')
    expect(hard).toContain('typescript')
    expect(hard).toContain('shopify-hydrogen')
    expect(hard).toContain('design-systems')
  })

  it('splits "nice to have" skills into preferred', () => {
    expect(jd.preferred_skills).toContain('graphql')
    expect(jd.preferred_skills).toContain('nextjs')
    // preferred are NOT also listed as hard-required
    expect(jd.hard_required_skills.map((s) => s.canonical)).not.toContain('graphql')
  })

  it('reads the overall years bar', () => {
    expect(jd.min_years_total).toBe(5)
  })

  it('uses a senior per-skill bar', () => {
    expect(jd.hard_required_skills[0].min_years).toBe(3)
  })

  it('detects a clearance dealbreaker only when stated', () => {
    expect(jd.dealbreakers).toHaveLength(0)
    const cleared = parseJDText(
      'Backend Engineer',
      'Must hold an active security clearance. 4+ years Node.',
    )
    expect(cleared.dealbreakers.some((d) => d.type === 'clearance')).toBe(true)
  })

  it('empty description → no skills, no crash', () => {
    const empty = parseJDText('Software Engineer', '')
    expect(empty.hard_required_skills).toEqual([])
    expect(empty.title.family).toBe('fullstack') // generic SWE
  })
})
