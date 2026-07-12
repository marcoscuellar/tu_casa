/**
 * Spec schemas as TypeScript types.
 *
 * These mirror, field-for-field, the four handoff specs:
 *   - resume_jd_scoring_rubric_FIXED.md  (ParsedResume, ParsedJD, ScoreResult)
 *   - ENGINE_4_Job_Discovery_SEEKER_MODE.md  (DiscoveredJob)
 *   - ENGINE_3_Job_Audit_SEEKER_MODE.md  (AuditResult)
 *   - interview_research_engine.md  (ResearchBrief)
 *
 * The deterministic engines operate on these shapes. The non-deterministic
 * seams (job crawl, liveness re-check, résumé/company research, verdict prose)
 * PRODUCE these shapes via providers — fixtures now, live LLM/web later.
 */

/* ============================================================
   Rubric — input schema (resume_jd_scoring_rubric_FIXED.md)
   ============================================================ */

export interface ResumeTitle {
  raw: string
  family: string
  level: string
}

export interface ResumeSkill {
  canonical: string
  years: number
  last_used_year: number
}

export interface ParsedResume {
  titles: ResumeTitle[]
  skills: ResumeSkill[]
  years_total: number
  industries: string[]
  certs_clearances: string[]
  location: string
  onsite_ok: boolean
}

export type DealbreakerType = 'cert' | 'clearance' | 'license' | 'location'

export interface Dealbreaker {
  type: DealbreakerType
  value: string
  hard: boolean
}

export interface RequiredSkill {
  canonical: string
  min_years: number
}

export interface ParsedJD {
  title: { family: string; level: string }
  hard_required_skills: RequiredSkill[]
  preferred_skills: string[]
  min_years_total: number
  dealbreakers: Dealbreaker[]
}

/* ============================================================
   Rubric — output
   ============================================================ */

export type Verdict = 'STRONG' | 'PARTIAL' | 'WEAK' | 'NO_GO'

export interface LayerBreakdown {
  /** Layer 1 — skills/tech overlap (max 45) */
  skills: number
  /** Layer 2 — seniority/years (max 25) */
  seniority: number
  /** Layer 3 — title/role alignment (max 15) */
  title: number
  /** Layer 4 — recency (max 15) */
  recency: number
}

export interface FitItem {
  t: string
  d: string
}

export interface ScoreResult {
  /** 0–100, rounded. Deterministic. */
  score: number
  breakdown: LayerBreakdown
  verdict: Verdict
  /** Deterministic calm-tone headline mapped from the verdict. */
  verdictHead: string
  /** Deterministic: matched hard-required skills, seniority/recency/title wins. */
  covered: FitItem[]
  /** Deterministic: named gaps — missing tool, years short, dealbreaker. */
  gaps: FitItem[]
  /** Soft dealbreakers that failed (allowed, but surfaced). */
  softFlags: string[]
  hardRequiredMatched: string[]
  hardRequiredMissing: string[]
  allHardPresent: boolean
  seniorityBarMet: boolean
}

/* ============================================================
   Engine 4 — Job Discovery output (per job)
   ============================================================ */

export type SourceType =
  | 'company-ats'
  | 'aggregator-corroborated'
  | 'aggregator-only'

export type Confidence = 'verified' | 'likely' | 'flagged-verify'

export type OpenStatus = 'open' | 'unknown' | 'closed'

export interface DiscoveredJob {
  id: string
  company: string
  role: string
  location: string
  remote: boolean
  link: string
  /** Real posted/last-seen date, or "Unknown" — never a guess. */
  postedDate: string
  /** Salary range as posted, if the posting states one. */
  salary?: string
  sourceType: SourceType
  confidence: Confidence
  status: OpenStatus
  /** Plain-language note shown when confidence is flagged-verify. */
  note?: string
  /** The posting's parsed JD — this is what the rubric scores against. */
  jd: ParsedJD
}

/* ============================================================
   Engine 3 — Audit output (per job)
   ============================================================ */

export type RecheckStatus = 'verified' | 'flagged' | 'dead'
export type StillOpen = 'yes' | 'unknown' | 'no-confirmed'

export interface AuditResult {
  jobId: string
  recheck: RecheckStatus
  stillOpen: StillOpen
  confidence: Confidence
  /** id of the job this duplicates, if any (the survivor). */
  duplicateOf?: string
  /** Required in plain language whenever recheck === 'flagged'. */
  note?: string
}

/** A job that survived Engine 3 (verified or flagged), carrying its audit. */
export interface AuditedJob extends DiscoveredJob {
  audit: AuditResult
}

/* ============================================================
   Pipeline — a scored, ranked opening reaching the candidate
   ============================================================ */

export interface RankedJob extends AuditedJob {
  fit: ScoreResult
}

/* ============================================================
   Interview Research Engine output (interview_research_engine.md)
   ============================================================ */

export interface ResearchSignal {
  signal: string
  source: string
  date: string
  youCouldSay: string
}

export interface StatedPriority {
  priority: string
  howToUse: string
}

export interface ResearchBrief {
  /** Section 1 */
  companyOneLiner: string
  stageSize?: string
  mainProduct?: string
  /** Section 2 — recent, sourced, dated signals */
  signals: ResearchSignal[]
  /** Section 3 — the company's own stated priorities */
  statedPriorities: StatedPriority[]
  /** Section 4 — only if knowable; undefined = "prep for the role, not the person" */
  interviewer?: { name: string; title: string; note: string }
  /** Section 5 — themes derived from the role itself */
  likelyThemes: string[]
  /** QA/handoff outcome. THIN is a valid, honest result. */
  readiness: 'GO' | 'THIN'
}
