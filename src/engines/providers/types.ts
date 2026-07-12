/**
 * Provider interfaces — the non-deterministic seams.
 *
 * Everything here is what the specs mark as research / LLM / live web. Today
 * these are backed by fixtures (providers/fixtures.ts); later they're backed by
 * real résumé parsing, a job crawl + liveness re-check, company research, and an
 * LLM narration of the verdict. The deterministic engines never import fixtures
 * directly — they take a provider, so swapping in live implementations touches
 * only this seam.
 */

import type { RawPosting } from '../discovery'
import type { RecheckSignal } from '../audit'
import type {
  HiringInsight,
  ParsedJD,
  ParsedResume,
  ResearchBrief,
  ScoreResult,
} from '../types'

export interface ResumeProvider {
  /** Extract the rubric's résumé schema from an uploaded résumé. (LLM) */
  parseResume(fileRef?: unknown): ParsedResume
}

export interface DiscoveryProvider {
  /** Find real, live postings implied by the résumé. (Live web crawl) */
  findPostings(resume: ParsedResume): RawPosting[]
}

export interface AuditProvider {
  /** Independently re-check liveness per job id. (Live link re-check) */
  recheck(jobs: RawPosting[]): Record<string, RecheckSignal>
}

export interface ResearchProvider {
  /** Sourced, dated company/role research for the cheat sheet. (LLM + web) */
  research(company: string, role: string): ResearchBrief
}

export interface NarrateProvider {
  /**
   * The one LLM seam inside scoring: the honest verdict write-up + transfer
   * nuance the rules miss. The numeric score stays deterministic.
   */
  narrateVerdict(score: ScoreResult, company: string, role: string): string
}

export interface ReasoningProvider {
  /**
   * The "why does this role exist?" reasoning step (LLM). Given the company's
   * verified signals + stated priorities, reason to why the role is open and
   * derive the talking points + likely questions from that situation.
   *
   * CONTRACT: every returned item's `sources` MUST cite real signal/priority
   * texts from the brief. The deterministic layer (reasoning.ts) re-validates
   * this and drops anything ungrounded, so a hallucinated motive can never
   * reach the candidate. Return null when no honest inference is possible.
   */
  whyHiring(brief: ResearchBrief, role: string): HiringInsight | null
}

export interface JDParseProvider {
  /**
   * Parked capability: parse a pasted job description into the rubric's JD
   * schema, for an optional "check a specific job" feature. Off the main
   * résumé-in flow, but wired so it can be exposed later. (LLM)
   */
  parseJobDescription(text: string): ParsedJD
}

export interface Providers {
  resume: ResumeProvider
  discovery: DiscoveryProvider
  audit: AuditProvider
  research: ResearchProvider
  reasoning: ReasoningProvider
  narrate: NarrateProvider
  jd: JDParseProvider
}
