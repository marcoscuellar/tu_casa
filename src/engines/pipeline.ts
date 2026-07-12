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
import { deriveHiringInsight } from './reasoning'
import { gateResearch, type GatedResearch } from './research'
import { scoreResume } from './scoring'
import type {
  Confidence,
  HiringInsight,
  ParsedResume,
  RankedJob,
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
  jobs: RankedJob[]
  /** How many postings were dropped/collapsed, for honest UI messaging. */
  droppedCount: number
  duplicateCount: number
}

/** Run discover → audit → score → rank on a résumé. */
export function runPipeline(
  providers: Providers,
  opts: { asOfYear?: number } = {},
): PipelineResult {
  const asOfYear = opts.asOfYear ?? new Date().getFullYear()

  const resume = providers.resume.parseResume()
  const raw = providers.discovery.findPostings(resume)
  const discovered = runDiscovery(raw)
  const signals = providers.audit.recheck(raw)
  const { survivors, dropped, duplicates } = runAudit(discovered, signals)

  const jobs: RankedJob[] = survivors
    .map((job) => ({ ...job, fit: scoreResume(resume, job.jd, { asOfYear }) }))
    .sort((a, b) => {
      // Ranked by earned score; ties broken by confidence, then id.
      if (b.fit.score !== a.fit.score) return b.fit.score - a.fit.score
      const c = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence]
      if (c !== 0) return c
      return a.id.localeCompare(b.id)
    })

  return {
    resume,
    jobs,
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
