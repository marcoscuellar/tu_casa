import { describe, expect, it } from 'vitest'
import {
  evaluateDealbreakers,
  recencyLayer,
  recencyMultiplier,
  scoreResume,
  seniorityFraction,
  skillsLayer,
  titleLayer,
} from './scoring'
import { toCanonical } from './synonymMap'
import type { ParsedJD, ParsedResume } from './types'

/* ---------- builders ---------- */

const baseResume = (over: Partial<ParsedResume> = {}): ParsedResume => ({
  titles: [{ raw: 'Senior Frontend Engineer', family: 'frontend', level: 'senior' }],
  skills: [
    { canonical: 'react', years: 7, last_used_year: 2026 },
    { canonical: 'typescript', years: 6, last_used_year: 2026 },
    { canonical: 'shopify-hydrogen', years: 3, last_used_year: 2026 },
  ],
  years_total: 8,
  industries: ['ecommerce'],
  certs_clearances: [],
  location: 'Remote',
  onsite_ok: true,
  ...over,
})

const baseJD = (over: Partial<ParsedJD> = {}): ParsedJD => ({
  title: { family: 'frontend', level: 'senior' },
  hard_required_skills: [
    { canonical: 'react', min_years: 5 },
    { canonical: 'typescript', min_years: 3 },
  ],
  preferred_skills: ['shopify-hydrogen'],
  min_years_total: 5,
  dealbreakers: [],
  ...over,
})

const AS_OF = 2026

/* ============================================================
   Synonym map
   ============================================================ */

describe('synonym map', () => {
  it('normalizes aliases and strips versions', () => {
    expect(toCanonical('React.js')).toBe('react')
    expect(toCanonical('React 18')).toBe('react')
    expect(toCanonical('reactjs')).toBe('react')
    expect(toCanonical('Kubernetes')).toBe('k8s')
  })
  it('keeps genuinely different products separate (MySQL ≠ SQL Server)', () => {
    expect(toCanonical('mssql')).toBe('sql-server')
    expect(toCanonical('MySQL')).toBe('mysql')
    expect(toCanonical('mssql')).not.toBe(toCanonical('mysql'))
  })
  it('is idempotent on already-canonical values', () => {
    expect(toCanonical('react')).toBe('react')
    expect(toCanonical(toCanonical('React.js'))).toBe('react')
  })
})

/* ============================================================
   Layer 1 — empty-category rules / div-by-zero safety
   ============================================================ */

describe('Layer 1 — skills', () => {
  it('awards full 35 when nothing is hard-required (empty-category rule)', () => {
    const L = skillsLayer(baseResume(), baseJD({ hard_required_skills: [] }))
    // 35 (no hard) + 10 (pref shopify-hydrogen matched) = 45
    expect(L.points).toBe(45)
  })
  it('awards full 10 when nothing is preferred (empty-category rule)', () => {
    const L = skillsLayer(baseResume(), baseJD({ preferred_skills: [] }))
    // both hard matched → 35, preferred empty → 10
    expect(L.points).toBe(45)
  })
  it('never divides by zero for a fully empty JD', () => {
    const L = skillsLayer(
      baseResume(),
      baseJD({ hard_required_skills: [], preferred_skills: [] }),
    )
    expect(L.points).toBe(45)
    expect(Number.isNaN(L.points)).toBe(false)
  })
  it('scores partial hard-required coverage proportionally', () => {
    const L = skillsLayer(
      baseResume({ skills: [{ canonical: 'react', years: 7, last_used_year: 2026 }] }),
      baseJD(),
    )
    // 1 of 2 hard matched → 17.5, preferred (hydrogen) missing → 0
    expect(L.points).toBeCloseTo(17.5, 5)
    expect(L.hardMissing).toEqual(['typescript'])
  })
})

/* ============================================================
   Layer 2 — seniority graduated credit
   ============================================================ */

describe('Layer 2 — seniority fraction', () => {
  it('grades meets / within 1 / within 2 / else', () => {
    expect(seniorityFraction(5, 5)).toBe(1)
    expect(seniorityFraction(4, 5)).toBe(0.6)
    expect(seniorityFraction(3, 5)).toBe(0.3)
    expect(seniorityFraction(2, 5)).toBe(0)
  })
  it('treats a zero/absent bar as met', () => {
    expect(seniorityFraction(0, 0)).toBe(1)
  })
})

/* ============================================================
   Layer 3 — title alignment (deterministic, different family = 0)
   ============================================================ */

describe('Layer 3 — title', () => {
  const jd = baseJD().title
  it('same family + same level → 15', () => {
    expect(titleLayer([{ raw: '', family: 'frontend', level: 'senior' }], jd)).toBe(15)
  })
  it('same family, ±1 level → 10', () => {
    expect(titleLayer([{ raw: '', family: 'frontend', level: 'lead' }], jd)).toBe(10)
  })
  it('adjacent family, transferable → 6', () => {
    expect(titleLayer([{ raw: '', family: 'fullstack', level: 'senior' }], jd)).toBe(6)
  })
  it('different family → 0 (deterministic, no range)', () => {
    expect(titleLayer([{ raw: '', family: 'design', level: 'senior' }], jd)).toBe(0)
  })
})

/* ============================================================
   Layer 4 — recency buckets at EXACTLY 1 / 3 / 5 / 8 years
   ============================================================ */

describe('Layer 4 — recency buckets (half-open)', () => {
  it('places exact boundary years in the lower bucket', () => {
    expect(recencyMultiplier(1)).toBe(1.0)
    expect(recencyMultiplier(3)).toBe(0.8)
    expect(recencyMultiplier(5)).toBe(0.5)
    expect(recencyMultiplier(8)).toBe(0.25)
  })
  it('decays beyond 8 years', () => {
    expect(recencyMultiplier(8.001)).toBe(0.1)
    expect(recencyMultiplier(20)).toBe(0.1)
  })
  it('averages multipliers across matched hard-required skills', () => {
    const resume = baseResume({
      skills: [
        { canonical: 'react', years: 7, last_used_year: 2026 }, // 0 yrs ago → 1.0
        { canonical: 'typescript', years: 6, last_used_year: 2021 }, // 5 yrs ago → 0.5
      ],
    })
    const L = recencyLayer(resume, baseJD(), AS_OF)
    // avg(1.0, 0.5) = 0.75 → 15 × 0.75 = 11.25
    expect(L.points).toBeCloseTo(11.25, 5)
  })
  it('empty-set rule: zero matched hard-required skills → 0 (never average empty)', () => {
    const resume = baseResume({ skills: [] })
    const L = recencyLayer(resume, baseJD(), AS_OF)
    expect(L.points).toBe(0)
  })
})

/* ============================================================
   Dealbreaker gate — overrides a HIGH score to NO-GO
   ============================================================ */

describe('dealbreaker gate', () => {
  it('legal gate (clearance) forces NO_GO even with a top raw score', () => {
    const jd = baseJD({
      dealbreakers: [
        { type: 'clearance', value: 'TS/SCI', hard: true },
      ],
    })
    const r = scoreResume(baseResume(), jd, { asOfYear: AS_OF })
    expect(r.score).toBeGreaterThanOrEqual(80) // raw score would map STRONG
    expect(r.verdict).toBe('NO_GO') // gate overrides
    expect(r.gaps.some((g) => g.t.includes('TS/SCI'))).toBe(true) // names the gap
  })
  it('legal gate (license) forces NO_GO', () => {
    const jd = baseJD({
      dealbreakers: [{ type: 'license', value: 'RN', hard: true }],
    })
    const r = scoreResume(baseResume(), jd, { asOfYear: AS_OF })
    expect(r.verdict).toBe('NO_GO')
  })
  it('is satisfied when the candidate holds the credential', () => {
    const jd = baseJD({
      dealbreakers: [{ type: 'clearance', value: 'TS/SCI', hard: true }],
    })
    const r = scoreResume(baseResume({ certs_clearances: ['TS/SCI'] }), jd, {
      asOfYear: AS_OF,
    })
    expect(r.verdict).toBe('STRONG')
  })
  it('hard non-legal gate (onsite location) caps at PARTIAL, not NO_GO', () => {
    const jd = baseJD({
      dealbreakers: [{ type: 'location', value: 'New York, onsite', hard: true }],
    })
    const r = scoreResume(baseResume({ onsite_ok: false, location: 'Austin' }), jd, {
      asOfYear: AS_OF,
    })
    expect(r.verdict).toBe('PARTIAL')
  })
  it('soft dealbreaker is allowed but flagged', () => {
    const jd = baseJD({
      dealbreakers: [{ type: 'cert', value: 'AWS SA-Pro', hard: false }],
    })
    const r = scoreResume(baseResume(), jd, { asOfYear: AS_OF })
    expect(r.softFlags.some((f) => f.includes('AWS SA-Pro'))).toBe(true)
    expect(r.verdict).not.toBe('NO_GO')
  })
  it('classifies fails by severity', () => {
    const g = evaluateDealbreakers(baseResume({ onsite_ok: false, location: 'Austin' }), {
      ...baseJD(),
      dealbreakers: [
        { type: 'license', value: 'RN', hard: true },
        { type: 'location', value: 'NYC', hard: true },
        { type: 'cert', value: 'PMP', hard: false },
      ],
    })
    expect(g.legalFail).toHaveLength(1)
    expect(g.hardFail).toHaveLength(1)
    expect(g.softFail).toHaveLength(1)
  })
})

/* ============================================================
   End-to-end verdicts
   ============================================================ */

describe('scoreResume — verdicts', () => {
  it('STRONG: full match clears 80 with all hard present + bar met', () => {
    const r = scoreResume(baseResume(), baseJD(), { asOfYear: AS_OF })
    expect(r.score).toBe(100)
    expect(r.verdict).toBe('STRONG')
    expect(r.allHardPresent).toBe(true)
  })
  it('PARTIAL: a named missing tool downgrades even a high score', () => {
    const jd = baseJD({
      hard_required_skills: [
        { canonical: 'react', min_years: 5 },
        { canonical: 'typescript', min_years: 3 },
        { canonical: 'graphql', min_years: 2 },
      ],
    })
    const r = scoreResume(baseResume(), jd, { asOfYear: AS_OF })
    expect(r.verdict).toBe('PARTIAL')
    expect(r.gaps.some((g) => g.t.toLowerCase().includes('graphql'))).toBe(true)
  })
  it('WEAK: under ~half the required skills scores < 50', () => {
    const jd = baseJD({
      hard_required_skills: [
        { canonical: 'react', min_years: 5 },
        { canonical: 'graphql', min_years: 3 },
        { canonical: 'k8s', min_years: 3 },
        { canonical: 'gcp', min_years: 3 },
        { canonical: 'sql-server', min_years: 3 },
      ],
      preferred_skills: ['aws', 'power bi'],
      title: { family: 'devops', level: 'senior' },
    })
    const r = scoreResume(baseResume(), jd, { asOfYear: AS_OF })
    expect(r.score).toBeLessThan(50)
    expect(r.verdict).toBe('WEAK')
  })
})
