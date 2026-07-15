/**
 * The résumé-in → jobs-out pipeline.
 *
 *   Engine 4 discovers & first-pass validates
 *     → Engine 3 independently audits (dedupe; only confirmed-dead removed)
 *       → the rubric scores the résumé against each survivor
 *         → a ranked, honest list reaches the candidate.
 *
 * The candidate provides only a résumé — no job description is ever asked for.
 * All orchestration here is deterministic; the LLM/web work is behind providers.
 */

import { runAudit } from './audit'
import { runDiscovery } from './discovery'
import { industryFit, resumeIndustryTags, type IndustryTag } from './industry'
import { locationFit } from './location'
import { deriveHiringInsight } from './reasoning'
import { gateResearch, type GatedResearch } from './research'
import { scoreResume } from './scoring'
import type {
  Confidence,
  HiringInsight,
  ParsedResume,
  RankedJob,
  ResumeUpload,
  ScoreResult,
} from './types'
import type { Providers } from './providers/types'

const CONFIDENCE_RANK: Record<Confidence, number> = {
  verified: 0,
  likely: 1,
  'flagged-verify': 2,
}

export interface PipelineResult {
  resume: ParsedResume
  /** The focused, ranked shortlist — the top `focusLimit` matches. */
  jobs: RankedJob[]
  /** The ranked tail beyond the focus cap, revealed on "show broader matches". */
  broaderJobs: RankedJob[]
  /** Postings actually reviewed (fetched + relevance-filtered) before the cap. */
  rawCount: number
  /** The focus cap applied to `jobs` this run. */
  focusLimit: number
  /** How many postings were dropped/collapsed, for honest UI messaging. */
  droppedCount: number
  duplicateCount: number
}

/** At most this many roles from any one company surface before the overflow tail. */
export const PER_COMPANY_CAP = 2

/**
 * Focus cap — after QA + rubric + rank run on ALL raw postings (quality is never
 * cut early), we surface the strongest `FOCUS_LIMIT` as the shortlist and hold
 * the rest as a "broader matches" tail. 700 fit-for roles overwhelms people
 * (especially our neurodivergent users); the best 50 is a calm, honest set.
 *
 * Note: discovery is fully deterministic — no LLM runs over the job list — so
 * this cap saves ~0 LLM tokens today. Its wins are UX, payload, and render cost,
 * and it future-proofs the day fit-scoring/research move onto an LLM.
 */
export const DEFAULT_FOCUS_LIMIT = 50
export const MIN_FOCUS_LIMIT = 30
export const MAX_FOCUS_LIMIT = 75

/** Keep a requested focus limit inside the tunable 30–75 band. */
export function clampFocusLimit(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FOCUS_LIMIT
  return Math.max(MIN_FOCUS_LIMIT, Math.min(MAX_FOCUS_LIMIT, Math.round(n)))
}

/**
 * Keep the shortlist varied. A big employer (e.g. Stripe posting 40 roles)
 * would otherwise flood the top of the ranked list. Walk the jobs in ranked
 * order and let each company place its best `cap` roles up front; a company's
 * cap+1th role and beyond drop to an overflow tail (still ranked, still shown
 * via "show more") — nothing is removed, the top just reads as a spread of
 * companies instead of one.
 */
export function diversifyByCompany(
  jobs: RankedJob[],
  cap = PER_COMPANY_CAP,
): RankedJob[] {
  const primary: RankedJob[] = []
  const overflow: RankedJob[] = []
  const seen = new Map<string, number>()
  for (const job of jobs) {
    const key = job.company.trim().toLowerCase()
    const count = seen.get(key) ?? 0
    if (count < cap) {
      primary.push(job)
      seen.set(key, count + 1)
    } else {
      overflow.push(job)
    }
  }
  return [...primary, ...overflow]
}

/** Run discover → audit → score → rank on a résumé. */
export async function runPipeline(
  providers: Providers,
  opts: { asOfYear?: number; upload?: ResumeUpload; limit?: number } = {},
): Promise<PipelineResult> {
  const resume = await providers.resume.parseResume(opts.upload)
  return runPipelineFromResume(providers, resume, { asOfYear: opts.asOfYear, limit: opts.limit })
}

/**
 * The post-parse half of the pipeline: discover → audit → score → rank on an
 * already-parsed (and user-confirmed) résumé. Split out so the flow can pause on
 * a "confirm your info" step between parsing and searching.
 */
export async function runPipelineFromResume(
  providers: Providers,
  resume: ParsedResume,
  opts: { asOfYear?: number; limit?: number } = {},
): Promise<PipelineResult> {
  const asOfYear = opts.asOfYear ?? new Date().getFullYear()
  const focusLimit = clampFocusLimit(opts.limit ?? DEFAULT_FOCUS_LIMIT)

  const raw = await providers.discovery.findPostings(resume)
  const rawCount = raw.length
  const discovered = runDiscovery(raw)
  const signals = providers.audit.recheck(raw)
  const { survivors, dropped, duplicates } = runAudit(discovered, signals)

  // The candidate's own fields, resolved once (empty when the résumé names no
  // concrete domain — industry then stays neutral for every job).
  const resumeTags = resumeIndustryTags(resume.industries)

  // Score each survivor, then rank by (earned fit − location penalty − field
  // penalty). The displayed fit score stays pure; location and industry are
  // rank adjustments, never dropped and always surfaced with a plain note.
  const scored = survivors.map((job) => {
    const fit = scoreResume(resume, job.jd, { asOfYear })
    const loc = locationFit(resume, job)
    const ind = industryFit(resumeTags, job.industry as IndustryTag | undefined)
    const ranked: RankedJob = {
      ...job,
      fit,
      locationNote: loc.note,
      industryMatch: ind.match,
      industryLabel: ind.jobLabel,
      industryNote: ind.note,
    }
    return { ranked, effective: fit.score - loc.penalty - ind.penalty }
  })
  scored.sort((a, b) => {
    if (b.effective !== a.effective) return b.effective - a.effective
    const c = CONFIDENCE_RANK[a.ranked.confidence] - CONFIDENCE_RANK[b.ranked.confidence]
    if (c !== 0) return c
    return a.ranked.id.localeCompare(b.ranked.id)
  })
  // Rank everything, THEN cap. Capping after the rubric guarantees the shortlist
  // is the genuinely strongest matches — never an arbitrary early slice.
  const ranked = diversifyByCompany(scored.map((s) => s.ranked))
  const jobs = ranked.slice(0, focusLimit)
  const broaderJobs = ranked.slice(focusLimit)

  // Observability: raw pulled → focused, so the number can be monitored/tuned.
  // Token note: discovery is deterministic — 0 LLM tokens spent over this list.
  console.info(
    `[discovery] reviewed ${rawCount} postings → ${jobs.length} focused` +
      ` (+${broaderJobs.length} broader) · LLM tokens: 0 (deterministic pipeline)`,
  )

  return {
    resume,
    jobs,
    broaderJobs,
    rawCount,
    focusLimit,
    droppedCount: dropped.length,
    duplicateCount: duplicates.length,
  }
}

/** Narrate a job's verdict (the one LLM seam in scoring). */
export function narrateFit(
  providers: Providers,
  fit: ScoreResult,
  company: string,
  role: string,
): string {
  return providers.narrate.narrateVerdict(fit, company, role)
}

/** Build a QA-gated research brief for a job's cheat sheet. */
export function buildResearch(
  providers: Providers,
  company: string,
  role: string,
): GatedResearch {
  return gateResearch(providers.research.research(company, role))
}

/**
 * Reason "why does this role exist?" from the gated research, grounded in real
 * signals. Returns null when intelligence is thin (no honest motive to infer).
 */
export function buildHiringInsight(
  providers: Providers,
  gated: GatedResearch,
  role: string,
): HiringInsight | null {
  return deriveHiringInsight(gated, role, providers.reasoning)
}
