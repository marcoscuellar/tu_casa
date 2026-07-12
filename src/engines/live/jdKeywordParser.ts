/**
 * Deterministic keyword JD parser — real posting text → the rubric's ParsedJD.
 *
 * The live ATS feeds give us a job's title + description *text*, but the rubric
 * scores against a structured ParsedJD. Turning text into structure is normally
 * an LLM job (JDParseProvider); this is the deterministic heuristic that lets
 * the full pipeline score REAL postings today, no LLM required:
 *   - family/level from the title (shared taxonomy)
 *   - skills from the synonym vocabulary, split hard vs preferred by section
 *   - min-years from "N+ years" phrases
 *   - clearance dealbreaker from high-precision keywords
 *
 * It over/under-reaches sometimes (e.g. "React" inside "React Native"); an LLM
 * parser swaps in behind the same JDParseProvider interface without touching
 * the pipeline.
 */

import { scanSkills } from '../synonymMap'
import { inferFamily, inferLevel } from '../taxonomy'
import type { Dealbreaker, ParsedJD, RequiredSkill } from '../types'

const PREFERRED_MARKERS = [
  'nice to have',
  'nice-to-have',
  'preferred qualifications',
  'preferred:',
  'bonus points',
  'bonus:',
  'a plus',
  'pluses',
  'nice if',
  'good to have',
]

const CLEARANCE_MARKERS = [
  'security clearance',
  'active clearance',
  'ts/sci',
  'top secret',
  'must be a us citizen',
  'u.s. citizenship required',
  'us citizenship required',
]

/** First index of any preferred-section marker, or -1. */
function preferredSplit(lower: string): number {
  let idx = -1
  for (const m of PREFERRED_MARKERS) {
    const i = lower.indexOf(m)
    if (i >= 0 && (idx === -1 || i < idx)) idx = i
  }
  return idx
}

/** Max "N+ years" figure in the text (the overall bar), 0 if none. */
function maxYears(text: string): number {
  let max = 0
  const re = /(\d{1,2})\s*\+?\s*(?:years|yrs)\b/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10)
    if (n > max && n <= 20) max = n
  }
  return max
}

export function parseJDText(title: string, description: string): ParsedJD {
  const family = inferFamily(title)
  const level = inferLevel(title)
  const text = description || ''
  const lower = text.toLowerCase()

  // Split requirements vs preferred by the first "nice to have" style marker.
  const splitAt = preferredSplit(lower)
  const requiredText = splitAt >= 0 ? text.slice(0, splitAt) : text
  const preferredText = splitAt >= 0 ? text.slice(splitAt) : ''

  const hardCanon = scanSkills(requiredText)
  const preferredCanon = scanSkills(preferredText).filter((s) => !hardCanon.includes(s))

  const overall = maxYears(text)
  // Presence matters more than exact per-skill tenure; use a modest per-skill bar.
  const perSkillBar = ['senior', 'staff', 'lead', 'principal'].includes(level) ? 3 : 2

  const hard_required_skills: RequiredSkill[] = hardCanon.map((canonical) => ({
    canonical,
    min_years: perSkillBar,
  }))

  const dealbreakers: Dealbreaker[] = []
  if (CLEARANCE_MARKERS.some((m) => lower.includes(m))) {
    dealbreakers.push({ type: 'clearance', value: 'Security clearance', hard: true })
  }

  return {
    title: { family, level },
    hard_required_skills,
    preferred_skills: preferredCanon,
    min_years_total: overall,
    dealbreakers,
  }
}
