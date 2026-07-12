import { describe, expect, it } from 'vitest'
import {
  parseResumeWith,
  ResumeParseError,
  validateParsedResume,
} from './resumeParser'

const AS_OF = 2026

// A realistic raw model output (extraction only — no family/level/canonical yet).
const rawOutput = {
  titles: [{ raw: 'Senior Frontend Engineer' }, { raw: 'Frontend Engineer' }],
  skills: [
    { name: 'React.js', years: 7, last_used_year: 2026 },
    { name: 'TypeScript', years: 6, last_used_year: 2026 },
    { name: 'Kubernetes', years: 2, last_used_year: 2024 },
  ],
  years_total: 8,
  industries: ['ecommerce'],
  certs_clearances: [],
  location: 'Remote',
  onsite_ok: true,
}

describe('validateParsedResume — deterministic normalization', () => {
  const r = validateParsedResume(rawOutput, { asOfYear: AS_OF })

  it('derives family/level from the title (not trusted from the model)', () => {
    expect(r.titles[0]).toEqual({
      raw: 'Senior Frontend Engineer',
      family: 'frontend',
      level: 'senior',
    })
  })

  it('normalizes skills through the synonym map', () => {
    const canon = r.skills.map((s) => s.canonical)
    expect(canon).toContain('react') // "React.js" → react
    expect(canon).toContain('typescript')
    expect(canon).toContain('k8s') // "Kubernetes" → k8s
  })

  it('coerces years_total and onsite_ok', () => {
    expect(r.years_total).toBe(8)
    expect(r.onsite_ok).toBe(true)
  })

  it('clamps out-of-range numbers and non-boolean onsite_ok', () => {
    const weird = validateParsedResume(
      {
        ...rawOutput,
        years_total: 999,
        onsite_ok: 'yes',
        skills: [{ name: 'React', years: -3, last_used_year: 3000 }],
      },
      { asOfYear: AS_OF },
    )
    expect(weird.years_total).toBe(60) // clamped
    expect(weird.onsite_ok).toBe(false) // only literal true counts
    expect(weird.skills[0].years).toBe(0) // clamped up from -3
    expect(weird.skills[0].last_used_year).toBe(AS_OF) // clamped down from 3000
  })

  it('dedupes skills by canonical id, keeping the strongest signal', () => {
    const dup = validateParsedResume(
      {
        ...rawOutput,
        skills: [
          { name: 'React', years: 3, last_used_year: 2022 },
          { name: 'React.js', years: 7, last_used_year: 2026 },
        ],
      },
      { asOfYear: AS_OF },
    )
    const react = dup.skills.filter((s) => s.canonical === 'react')
    expect(react).toHaveLength(1)
    expect(react[0].years).toBe(7) // max
    expect(react[0].last_used_year).toBe(2026) // most recent
  })

  it('drops nameless / malformed skill entries without crashing', () => {
    const r2 = validateParsedResume(
      { ...rawOutput, skills: [{ years: 3 }, null, 'nope', { name: '  ' }] },
      { asOfYear: AS_OF },
    )
    expect(r2.skills).toEqual([])
  })

  // ---- graceful failure: never fabricate a résumé ----

  it('throws when the model returns no object', () => {
    expect(() => validateParsedResume(null)).toThrow(ResumeParseError)
    expect(() => validateParsedResume('garbage')).toThrow(ResumeParseError)
  })

  it('throws when no readable job title was found', () => {
    expect(() =>
      validateParsedResume({ ...rawOutput, titles: [] }),
    ).toThrow(/résumé/i)
    expect(() =>
      validateParsedResume({ ...rawOutput, titles: [{ raw: '' }] }),
    ).toThrow(ResumeParseError)
  })
})

describe('parseResumeWith — orchestration with an injected model caller', () => {
  it('passes the model output through validation (no network)', async () => {
    const caller = async () => rawOutput
    const r = await parseResumeWith({ kind: 'text', text: '…' }, caller, {
      asOfYear: AS_OF,
    })
    expect(r.titles[0].family).toBe('frontend')
    expect(r.skills.map((s) => s.canonical)).toContain('react')
  })

  it('propagates a validation failure from a garbage model response', async () => {
    const caller = async () => ({ titles: [], skills: [] })
    await expect(
      parseResumeWith({ kind: 'text', text: '…' }, caller, { asOfYear: AS_OF }),
    ).rejects.toThrow(ResumeParseError)
  })
})
