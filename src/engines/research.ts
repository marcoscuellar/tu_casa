/**
 * Interview Research Engine — the QA / handoff gate
 * (interview_research_engine.md)
 *
 * The research itself (sourced, dated company facts) is a provider seam — that's
 * the part that needs live web + an LLM, and it must never fabricate. This file
 * is the deterministic QA gate that decides GO vs THIN before the brief feeds
 * the cheat sheet:
 *   - Every signal needs a source AND a date, or it doesn't go in.
 *   - GO requires a confirmed snapshot + at least 2 sourced/dated signals.
 *   - THIN is a valid, honest outcome: build the sheet on role prep only.
 */

import type { ResearchBrief } from './types'

export interface GatedResearch {
  /** Sanitized brief — sourceless/dateless signals removed. */
  brief: ResearchBrief
  readiness: 'GO' | 'THIN'
  /** Plain-language reasons, useful for the "public info was limited" note. */
  reasons: string[]
}

/**
 * Gate a research brief. Deterministic: strips any signal missing a source or
 * date, then decides readiness. Role-based prep (likelyThemes) always survives,
 * so a THIN sheet still works.
 */
export function gateResearch(input: ResearchBrief): GatedResearch {
  const reasons: string[] = []

  // Drop any signal that isn't both sourced and dated — no sourceless facts.
  const validSignals = input.signals.filter(
    (s) => s.source.trim() !== '' && s.date.trim() !== '',
  )
  if (validSignals.length < input.signals.length) {
    reasons.push('Some signals lacked a source or date and were dropped.')
  }

  const hasSnapshot = input.companyOneLiner.trim() !== ''
  if (!hasSnapshot) reasons.push('Company snapshot could not be confirmed.')
  if (validSignals.length < 2) {
    reasons.push('Fewer than two sourced, dated signals were found.')
  }

  const readiness: GatedResearch['readiness'] =
    hasSnapshot && validSignals.length >= 2 ? 'GO' : 'THIN'

  if (readiness === 'THIN') {
    reasons.push('Public info was limited — leaning on role-based prep.')
  }

  return {
    brief: { ...input, signals: validSignals, readiness },
    readiness,
    reasons,
  }
}
