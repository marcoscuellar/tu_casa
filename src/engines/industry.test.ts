import { describe, expect, it } from 'vitest'
import {
  canonicalizeIndustry,
  industryFit,
  resumeIndustryTags,
} from './industry'

describe('canonicalizeIndustry', () => {
  it('maps concrete finance terms to fintech', () => {
    expect(canonicalizeIndustry('Payments')).toBe('fintech')
    expect(canonicalizeIndustry('Financial Services')).toBe('fintech')
    expect(canonicalizeIndustry('Banking')).toBe('fintech')
  })

  it('maps health terms to healthtech', () => {
    expect(canonicalizeIndustry('Healthcare')).toBe('healthtech')
    expect(canonicalizeIndustry('Digital Health')).toBe('healthtech')
  })

  it('handles hyphenated e-commerce', () => {
    expect(canonicalizeIndustry('E-Commerce')).toBe('ecommerce')
    expect(canonicalizeIndustry('Retail & Commerce')).toBe('ecommerce')
  })

  it('does NOT match short tokens inside longer words (ai in email)', () => {
    // "email marketing" is martech, never data-ai via a stray "ai" substring.
    expect(canonicalizeIndustry('Email Marketing')).toBe('martech')
  })

  it('returns null for generic business-model words (no fake domain)', () => {
    expect(canonicalizeIndustry('SaaS')).toBeNull()
    expect(canonicalizeIndustry('B2B Software')).toBeNull()
    expect(canonicalizeIndustry('Enterprise Technology')).toBeNull()
    expect(canonicalizeIndustry('Startup')).toBeNull()
  })
})

describe('resumeIndustryTags', () => {
  it('canonicalizes and dedupes, dropping unknowns', () => {
    expect(resumeIndustryTags(['Payments', 'Banking', 'SaaS', 'E-commerce'])).toEqual([
      'fintech',
      'ecommerce',
    ])
  })

  it('is empty when the résumé names no concrete domain', () => {
    expect(resumeIndustryTags(['SaaS', 'Technology', 'B2B'])).toEqual([])
  })
})

describe('industryFit', () => {
  it('is neutral when the job has no known industry', () => {
    const fit = industryFit(['fintech'], undefined)
    expect(fit.match).toBe('unknown')
    expect(fit.penalty).toBe(0)
  })

  it('surfaces the field but stays neutral when the résumé domain is unknown', () => {
    const fit = industryFit([], 'fintech')
    expect(fit.match).toBe('unknown')
    expect(fit.penalty).toBe(0)
    expect(fit.jobLabel).toBe('Fintech')
  })

  it('boosts (negative penalty) on a same-field match', () => {
    const fit = industryFit(['fintech', 'ecommerce'], 'fintech')
    expect(fit.match).toBe('same')
    expect(fit.penalty).toBeLessThan(0)
    expect(fit.note).toContain('Same field')
  })

  it('penalizes on a clear cross-field mismatch', () => {
    // The financial-SaaS case: an e-commerce/marketing background shown a fintech role.
    const fit = industryFit(['ecommerce', 'martech'], 'fintech')
    expect(fit.match).toBe('different')
    expect(fit.penalty).toBeGreaterThan(0)
    expect(fit.jobLabel).toBe('Fintech')
    expect(fit.note).toContain('Different field')
  })
})
