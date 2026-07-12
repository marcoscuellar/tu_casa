/**
 * Hiring-need reasoning — "why does this role exist?"
 *
 * No company hires just to hire. Every open role is a reaction to something real
 * — funding, a launch, a lost client, an expansion, a stated priority. This step
 * reasons from the company's *verified* situation to why the role exists, and
 * derives the talking points + likely questions from that — so the questions
 * come from the company's actual reality, not a generic template for the title.
 *
 * The reasoning itself is an LLM seam (ReasoningProvider). This file is the
 * DETERMINISTIC honesty guardrail around it:
 *   1. Gate — reasoning only runs on GO research (real, sourced signals). THIN
 *      intelligence can't honestly infer a motive → returns null.
 *   2. Grounding — every derived point/question must cite a real signal or
 *      stated priority from the brief. Anything ungrounded is dropped, so a
 *      hallucinated "why" can never reach the candidate.
 */

import type { GatedResearch } from './research'
import type { ReasoningProvider } from './providers/types'
import type {
  GroundedPoint,
  GroundedQuestion,
  HiringInsight,
  ResearchBrief,
} from './types'

/** The only claims a "why" may be built on: verified signals + stated priorities. */
export function groundableRefs(brief: ResearchBrief): Set<string> {
  return new Set<string>([
    ...brief.signals.map((s) => s.signal),
    ...brief.statedPriorities.map((p) => p.priority),
  ])
}

/** Grounded = cites at least one source, and every cited source is real. */
function isGrounded(sources: string[], refs: Set<string>): boolean {
  return sources.length > 0 && sources.every((s) => refs.has(s))
}

/**
 * Derive the hiring insight for a role, or null when it can't be honestly built.
 * Deterministic gate + grounding wrap the LLM reasoning provider.
 */
export function deriveHiringInsight(
  gated: GatedResearch,
  role: string,
  provider: ReasoningProvider,
): HiringInsight | null {
  // Honesty gate: no verified signals → no inferred motive. Full stop.
  if (gated.readiness !== 'GO') return null

  const raw = provider.whyHiring(gated.brief, role)
  if (!raw) return null

  const refs = groundableRefs(gated.brief)
  const talkingPoints: GroundedPoint[] = raw.talkingPoints.filter((t) =>
    isGrounded(t.sources, refs),
  )
  const likelyQuestions: GroundedQuestion[] = raw.likelyQuestions.filter((q) =>
    isGrounded(q.sources, refs),
  )

  // If grounding stripped everything, we have no honest insight to show.
  if (talkingPoints.length === 0 && likelyQuestions.length === 0) return null

  return { why: raw.why, talkingPoints, likelyQuestions }
}
