/**
 * Résumé ↔ JD scoring rubric — deterministic (resume_jd_scoring_rubric_FIXED.md).
 *
 * Parse both sides into the same structure, score four weighted layers to 100,
 * apply the dealbreaker gate, then map to a verdict. Rules produce the score;
 * an LLM only narrates the verdict body + catches transfer nuance (that seam
 * lives in providers/, NOT here). Everything in this file is pure and testable.
 */

import type {
  Dealbreaker,
  FitItem,
  LayerBreakdown,
  ParsedJD,
  ParsedResume,
  ResumeSkill,
  ResumeTitle,
  ScoreResult,
  Verdict,
} from './types'
import { toCanonical } from './synonymMap'
import { familiesAdjacent, levelRank } from './taxonomy'

/* ---------- Skill matching ---------- */

function findResumeSkill(
  resume: ParsedResume,
  requiredCanonical: string,
): ResumeSkill | undefined {
  const target = toCanonical(requiredCanonical)
  return resume.skills.find((s) => toCanonical(s.canonical) === target)
}

/* ============================================================
   Layer 1 — Skills / tech (45 pts)
   ============================================================ */

export interface SkillsLayer {
  points: number
  hardMatched: string[]
  hardMissing: string[]
  preferredMatched: string[]
}

export function skillsLayer(resume: ParsedResume, jd: ParsedJD): SkillsLayer {
  const hardTotal = jd.hard_required_skills.length
  const hardMatched: string[] = []
  const hardMissing: string[] = []
  for (const req of jd.hard_required_skills) {
    if (findResumeSkill(resume, req.canonical)) hardMatched.push(req.canonical)
    else hardMissing.push(req.canonical)
  }

  // Empty-category rule: nothing required to miss → full 35. Never divide by zero.
  const hardPoints =
    hardTotal === 0 ? 35 : 35 * (hardMatched.length / hardTotal)

  const prefTotal = jd.preferred_skills.length
  const preferredMatched = jd.preferred_skills.filter((p) =>
    findResumeSkill(resume, p),
  )
  // Empty-category rule: full 10 when nothing preferred. Never divide by zero.
  const prefPoints =
    prefTotal === 0 ? 10 : Math.min(10, 10 * (preferredMatched.length / prefTotal))

  return {
    points: hardPoints + prefPoints,
    hardMatched,
    hardMissing,
    preferredMatched,
  }
}

/* ============================================================
   Layer 2 — Seniority / years (25 pts)
   ============================================================ */

/** Graduated credit as a fraction of full: meets → 1 · within 1 → .6 · within 2 → .3 · else 0. */
export function seniorityFraction(actual: number, bar: number): number {
  if (!bar || bar <= 0) return 1 // no bar → nothing to clear
  if (actual >= bar) return 1
  if (actual >= bar - 1) return 0.6
  if (actual >= bar - 2) return 0.3
  return 0
}

export interface SeniorityLayer {
  points: number
  overallMet: boolean
  keySkill?: string
  keySkillYears: number
  keySkillBar: number
}

export function seniorityLayer(
  resume: ParsedResume,
  jd: ParsedJD,
): SeniorityLayer {
  // Overall years (10 pts)
  const overallFrac = seniorityFraction(resume.years_total, jd.min_years_total)
  const overallPoints = 10 * overallFrac
  const overallMet = overallFrac === 1

  // Key-skill years (15 pts) — measured on the single heaviest hard-required skill.
  const heaviest = [...jd.hard_required_skills].sort(
    (a, b) => b.min_years - a.min_years,
  )[0]

  if (!heaviest) {
    // No hard-required skills → nothing to gate key-skill seniority on. Award full,
    // consistent with Layer 1's "nothing required to miss".
    return {
      points: overallPoints + 15,
      overallMet,
      keySkillYears: 0,
      keySkillBar: 0,
    }
  }

  const candidateSkill = findResumeSkill(resume, heaviest.canonical)
  const keyYears = candidateSkill?.years ?? 0
  const keyFrac = seniorityFraction(keyYears, heaviest.min_years)
  const keyPoints = 15 * keyFrac

  return {
    points: overallPoints + keyPoints,
    overallMet,
    keySkill: heaviest.canonical,
    keySkillYears: keyYears,
    keySkillBar: heaviest.min_years,
  }
}

/* ============================================================
   Layer 3 — Title / role alignment (15 pts)
   ============================================================ */

export function titleScoreFor(rt: ResumeTitle, jd: ParsedJD['title']): number {
  const sameFamily = rt.family.trim().toLowerCase() === jd.family.trim().toLowerCase()
  if (sameFamily) {
    const diff = Math.abs(levelRank(rt.level) - levelRank(jd.level))
    if (diff === 0) return 15 // same family + same level
    if (diff === 1) return 10 // same family, ±1 level (stretch)
    return 6 // same family, further apart → still transferable
  }
  if (familiesAdjacent(rt.family, jd.family)) return 6 // adjacent family, transferable
  return 0 // different family → deterministic zero
}

export function titleLayer(titles: ResumeTitle[], jd: ParsedJD['title']): number {
  if (titles.length === 0) return 0
  // Candidate's strongest relevant title governs.
  return Math.max(...titles.map((t) => titleScoreFor(t, jd)))
}

/* ============================================================
   Layer 4 — Recency (15 pts)
   ============================================================ */

/** Half-open decay buckets: exactly 1/3/5/8 years land in the lower bucket. */
export function recencyMultiplier(yearsAgo: number): number {
  if (yearsAgo <= 1) return 1.0
  if (yearsAgo <= 3) return 0.8
  if (yearsAgo <= 5) return 0.5
  if (yearsAgo <= 8) return 0.25
  return 0.1
}

export interface RecencyLayer {
  points: number
  staleSkills: string[]
}

export function recencyLayer(
  resume: ParsedResume,
  jd: ParsedJD,
  asOfYear: number,
): RecencyLayer {
  const multipliers: number[] = []
  const staleSkills: string[] = []
  for (const req of jd.hard_required_skills) {
    const skill = findResumeSkill(resume, req.canonical)
    if (!skill) continue // only matched hard-required skills count
    const yearsAgo = asOfYear - skill.last_used_year
    const m = recencyMultiplier(yearsAgo)
    multipliers.push(m)
    if (m <= 0.5) staleSkills.push(req.canonical)
  }
  // Empty-set rule: zero matched hard-required skills → nothing to average → 0.
  if (multipliers.length === 0) return { points: 0, staleSkills }
  const avg = multipliers.reduce((a, b) => a + b, 0) / multipliers.length
  return { points: 15 * avg, staleSkills }
}

/* ============================================================
   Dealbreaker gate
   ============================================================ */

/** Legal gates (license/clearance) force No-go; other hard gates cap at Partial. */
function isLegalGate(d: Dealbreaker): boolean {
  return d.type === 'license' || d.type === 'clearance'
}

function dealbreakerFailed(resume: ParsedResume, d: Dealbreaker): boolean {
  if (d.type === 'location') {
    // Passes if the candidate can work onsite or already matches the location.
    if (resume.onsite_ok) return false
    return resume.location.trim().toLowerCase() !== d.value.trim().toLowerCase()
  }
  // cert / clearance / license — held credentials must contain the required value.
  const held = resume.certs_clearances.map((c) => c.trim().toLowerCase())
  return !held.includes(d.value.trim().toLowerCase())
}

interface GateResult {
  legalFail: Dealbreaker[]
  hardFail: Dealbreaker[]
  softFail: Dealbreaker[]
}

export function evaluateDealbreakers(
  resume: ParsedResume,
  jd: ParsedJD,
): GateResult {
  const legalFail: Dealbreaker[] = []
  const hardFail: Dealbreaker[] = []
  const softFail: Dealbreaker[] = []
  for (const d of jd.dealbreakers) {
    if (!dealbreakerFailed(resume, d)) continue
    if (!d.hard) softFail.push(d)
    else if (isLegalGate(d)) legalFail.push(d)
    else hardFail.push(d)
  }
  return { legalFail, hardFail, softFail }
}

/* ============================================================
   Verdict + assembly
   ============================================================ */

const VERDICT_HEAD: Record<Verdict, string> = {
  STRONG: 'Worth applying.',
  PARTIAL: 'Worth a look.',
  WEAK: 'Probably a stretch.',
  NO_GO: 'Not a fit right now.',
}

function dealbreakerLabel(d: Dealbreaker): string {
  if (d.type === 'location') return `Location: ${d.value}`
  return `${d.type[0].toUpperCase()}${d.type.slice(1)}: ${d.value}`
}

export function scoreResume(
  resume: ParsedResume,
  jd: ParsedJD,
  opts: { asOfYear?: number } = {},
): ScoreResult {
  const asOfYear = opts.asOfYear ?? new Date().getFullYear()

  const L1 = skillsLayer(resume, jd)
  const L2 = seniorityLayer(resume, jd)
  const L3 = titleLayer(resume.titles, jd.title)
  const L4 = recencyLayer(resume, jd, asOfYear)

  const breakdown: LayerBreakdown = {
    skills: round2(L1.points),
    seniority: round2(L2.points),
    title: L3,
    recency: round2(L4.points),
  }
  const raw = L1.points + L2.points + L3 + L4.points
  const score = Math.round(raw)

  const gate = evaluateDealbreakers(resume, jd)
  const allHardPresent = L1.hardMissing.length === 0
  const anyDealbreakerFailed =
    gate.legalFail.length + gate.hardFail.length + gate.softFail.length > 0

  /* ---- Verdict (dealbreaker gate overrides numeric thresholds) ---- */
  let verdict: Verdict
  if (gate.legalFail.length > 0) {
    verdict = 'NO_GO' // legal gate forces No-go regardless of raw score
  } else {
    if (score >= 80 && allHardPresent && L2.overallMet && !anyDealbreakerFailed) {
      verdict = 'STRONG'
    } else if (score >= 50) {
      verdict = 'PARTIAL'
    } else {
      verdict = 'WEAK'
    }
    // Hard (non-legal) dealbreaker → verdict cannot exceed Partial.
    if (gate.hardFail.length > 0 && verdict === 'STRONG') verdict = 'PARTIAL'
  }

  /* ---- Covered (deterministic wins) ---- */
  const covered: FitItem[] = []
  for (const skill of L1.hardMatched) {
    covered.push({ t: pretty(skill), d: 'Meets a core requirement for this role.' })
  }
  for (const pref of L1.preferredMatched) {
    covered.push({ t: pretty(pref), d: 'A listed nice-to-have you already have.' })
  }
  if (L2.overallMet) {
    covered.push({
      t: 'Experience bar met',
      d: `${resume.years_total} yrs total clears the role's ${jd.min_years_total}.`,
    })
  }

  /* ---- Gaps (named, per spec: missing tool / years short / dealbreaker) ---- */
  const gaps: FitItem[] = []
  for (const miss of L1.hardMissing) {
    gaps.push({
      t: `Missing: ${pretty(miss)}`,
      d: 'Listed as required. Name it honestly, or show the nearest thing you have.',
    })
  }
  if (!L2.overallMet && jd.min_years_total > 0) {
    gaps.push({
      t: 'Years short overall',
      d: `${resume.years_total} of ${jd.min_years_total} yrs — frame the depth you do have.`,
    })
  }
  if (
    L2.keySkill &&
    seniorityFraction(L2.keySkillYears, L2.keySkillBar) < 1 &&
    !L1.hardMissing.includes(L2.keySkill)
  ) {
    gaps.push({
      t: `Depth on ${pretty(L2.keySkill)}`,
      d: `${L2.keySkillYears} of ${L2.keySkillBar} yrs on the heaviest requirement.`,
    })
  }
  for (const skill of L4.staleSkills) {
    if (L1.hardMissing.includes(skill)) continue
    gaps.push({
      t: `${pretty(skill)} is a little stale`,
      d: 'Matched, but not used recently — refresh a recent example.',
    })
  }
  for (const d of [...gate.legalFail, ...gate.hardFail]) {
    gaps.push({
      t: dealbreakerLabel(d),
      d:
        d.type === 'location'
          ? 'Onsite/location requirement you may not meet.'
          : 'A hard requirement this role gates on.',
    })
  }

  const softFlags = gate.softFail.map(dealbreakerLabel)

  return {
    score,
    breakdown,
    verdict,
    verdictHead: VERDICT_HEAD[verdict],
    covered,
    gaps,
    softFlags,
    hardRequiredMatched: L1.hardMatched,
    hardRequiredMissing: L1.hardMissing,
    allHardPresent,
    seniorityBarMet: L2.overallMet,
  }
}

/* ---------- small helpers ---------- */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Turn a canonical skill id into readable display text. */
function pretty(canonical: string): string {
  const SPECIAL: Record<string, string> = {
    sql: 'SQL',
    'sql-server': 'SQL Server',
    mysql: 'MySQL',
    react: 'React',
    'react-native': 'React Native',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    gcp: 'GCP',
    aws: 'AWS',
    graphql: 'GraphQL',
    nextjs: 'Next.js',
    k8s: 'Kubernetes',
    'shopify-hydrogen': 'Shopify Hydrogen',
    'design-systems': 'Design systems',
    node: 'Node.js',
  }
  if (SPECIAL[canonical]) return SPECIAL[canonical]
  return canonical
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
}
