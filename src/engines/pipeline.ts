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
  jobs: RankedJob[]
  /** How many postings were dropped/collapsed, for honest UI messaging. */
  droppedCount: number
  duplicateCount: number
}

/** Run discover → audit → score → rank on a résumé. */
export async function runPipeline(
  providers: Providers,
  opts: { asOfYear?: number; upload?: ResumeUpload } = {},
): Promise<PipelineResult> {
  const asOfYear = opts.asOfYear ?? new Date().getFullYear()

  const resume = await providers.resume.parseResume(opts.upload)
  const raw = await providers.discovery.findPostings(resume)
  const discovered = runDiscovery(raw)
  const signals = providers.audit.recheck(raw)
  const { survivors, dropped, duplicates } = runAudit(discovered, signals)

  // Score each survivor, then rank by (earned fit − location penalty). The
  // displayed fit score stays pure; an onsite role for a remote-preferrer is
  // downgraded in rank, never dropped, and carries a plain note.
  const scored = survivors.map((job) => {
    const fit = scoreResume(resume, job.jd, { asOfYear })
    const loc = locationFit(resume, job)
    const ranked: RankedJob = { ...job, fit, locationNote: loc.note }
    return { ranked, effective: fit.score - loc.penalty }
  })
  scored.sort((a, b) => {
    if (b.effective !== a.effective) return b.effective - a.effective
    const c = CONFIDENCE_RANK[a.ranked.confidence] - CONFIDENCE_RANK[b.ranked.confidence]
    if (c !== 0) return c
    return a.ranked.id.localeCompare(b.ranked.id)
  })
  const jobs: RankedJob[] = scored.map((s) => s.ranked)

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
