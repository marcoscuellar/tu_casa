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
  const resume = await providers.resume.parseResume(opts.upload)
  return runPipelineFromResume(providers, resume, { asOfYear: opts.asOfYear })
}

/**
 * The post-parse half of the pipeline: discover → audit → score → rank on an
 * already-parsed (and user-confirmed) résumé. Split out so the flow can pause on
 * a "confirm your info" step between parsing and searching.
 */
export async function runPipelineFromResume(
  providers: Providers,
  resume: ParsedResume,
  opts: { asOfYear?: number } = {},
): Promise<PipelineResult> {
  const asOfYear = opts.asOfYear ?? new Date().getFullYear()

  const raw = await providers.discovery.findPostings(resume)
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
