import { describe, expect, it } from 'vitest'
import { deriveHiringInsight, groundableRefs } from './reasoning'
import { gateResearch } from './research'
import type { ReasoningProvider } from './providers/types'
import type { HiringInsight, ResearchBrief } from './types'

const goBrief = (): ResearchBrief => ({
  companyOneLiner: 'Acme builds widgets.',
  signals: [
    { signal: 'Raised Series B', source: 'TechCrunch', date: 'Feb 2026', youCouldSay: '…' },
    { signal: 'Launched v2', source: 'Blog', date: 'Mar 2026', youCouldSay: '…' },
  ],
  statedPriorities: [{ priority: 'Reliability', howToUse: '…' }],
  likelyThemes: ['System design'],
  readiness: 'GO',
})

const thinBrief = (): ResearchBrief => ({
  companyOneLiner: '',
  signals: [],
  statedPriorities: [],
  likelyThemes: ['System design', 'Ownership'],
  readiness: 'THIN',
})

/** A provider that returns a mix of grounded and fabricated items. */
const mixedProvider: ReasoningProvider = {
  whyHiring: (): HiringInsight => ({
    why: 'They raised and shipped v2, so they need scale.',
    talkingPoints: [
      { point: 'You scale systems', because: 'grounded', sources: ['Raised Series B'] },
      { point: 'FABRICATED', because: 'ungrounded', sources: ['They lost a big client'] }, // not a real signal
      { point: 'No source', because: 'ungrounded', sources: [] },
    ],
    likelyQuestions: [
      { question: 'How do you scale?', why: 'grounded', sources: ['Launched v2'] },
      { question: 'INVENTED', why: 'ungrounded', sources: ['CEO resigned'] }, // not real
    ],
  }),
}

describe('hiring-need reasoning — honesty guardrail', () => {
  it('groundable refs = the real signals + stated priorities', () => {
    const refs = groundableRefs(goBrief())
    expect(refs.has('Raised Series B')).toBe(true)
    expect(refs.has('Reliability')).toBe(true)
    expect(refs.has('They lost a big client')).toBe(false)
  })

  it('THIN research → null (cannot invent a motive without signals)', () => {
    const gated = gateResearch(thinBrief())
    expect(deriveHiringInsight(gated, 'Engineer', mixedProvider)).toBeNull()
  })

  it('GO research → insight, but ungrounded items are dropped', () => {
    const gated = gateResearch(goBrief())
    const insight = deriveHiringInsight(gated, 'Engineer', mixedProvider)!
    expect(insight).not.toBeNull()
    // Only the grounded talking point + question survive.
    expect(insight.talkingPoints.map((t) => t.point)).toEqual(['You scale systems'])
    expect(insight.likelyQuestions.map((q) => q.question)).toEqual(['How do you scale?'])
  })

  it('a provider that returns only fabricated items yields null (nothing grounded)', () => {
    const liar: ReasoningProvider = {
      whyHiring: (): HiringInsight => ({
        why: 'made up',
        talkingPoints: [{ point: 'x', because: 'y', sources: ['fake signal'] }],
        likelyQuestions: [{ question: 'q', why: 'w', sources: ['also fake'] }],
      }),
    }
    const gated = gateResearch(goBrief())
    expect(deriveHiringInsight(gated, 'Engineer', liar)).toBeNull()
  })

  it('a provider that declines (null) yields null', () => {
    const silent: ReasoningProvider = { whyHiring: () => null }
    const gated = gateResearch(goBrief())
    expect(deriveHiringInsight(gated, 'Engineer', silent)).toBeNull()
  })
})
