/**
 * Engine 4 — Job Discovery & Validation · SEEKER MODE
 * (ENGINE_4_Job_Discovery_SEEKER_MODE.md)
 *
 * The crawl itself is a provider seam (fixtures now, live web later). This file
 * is the deterministic classification the spec calls for:
 *   - One authoritative source (company/ATS) is enough → verified.
 *   - Aggregator-only needs corroboration → flag, never drop.
 *   - Liveness beats freshness: age NEVER downgrades; only confirmed-closed does.
 *   - Doubt → downgrade + flag, never silently drop. Discovery drops nothing.
 */

import type { Confidence, DiscoveredJob, OpenStatus, ParsedJD, SourceType } from './types'

/**
 * What the discovery provider hands us per posting. `livenessEvidence` is
 * EVIDENCE, not age — "posted a while ago" is not evidence of closure.
 */
export interface RawPosting {
  id: string
  company: string
  role: string
  location: string
  remote: boolean
  link: string
  postedDate: string // real date or "Unknown"
  salary?: string
  sourceType: SourceType
  livenessEvidence: 'confirmed-open' | 'none' | 'confirmed-closed'
  jd: ParsedJD
}

function statusFor(evidence: RawPosting['livenessEvidence']): OpenStatus {
  // Never "closed" unless confirmed; absence of evidence is "unknown", not closed.
  if (evidence === 'confirmed-closed') return 'closed'
  if (evidence === 'confirmed-open') return 'open'
  return 'unknown'
}

function confidenceFor(sourceType: SourceType): {
  confidence: Confidence
  note?: string
} {
  switch (sourceType) {
    case 'company-ats':
      // One authoritative source is enough — verified on that alone.
      return { confidence: 'verified' }
    case 'aggregator-corroborated':
      return { confidence: 'likely' }
    case 'aggregator-only':
      // Only aggregator-only needs a corroborating check — and even then, flag.
      return {
        confidence: 'flagged-verify',
        note: 'Aggregator-only listing — worth confirming on the company site.',
      }
  }
}

/**
 * Classify raw postings into DiscoveredJobs. Deterministic and total: every
 * input surfaces (nothing is dropped here — Engine 3 owns the only removal path).
 */
export function runDiscovery(raw: RawPosting[]): DiscoveredJob[] {
  return raw.map((p) => {
    const { confidence, note } = confidenceFor(p.sourceType)
    return {
      id: p.id,
      company: p.company,
      role: p.role,
      location: p.location,
      remote: p.remote,
      link: p.link,
      postedDate: p.postedDate,
      salary: p.salary,
      sourceType: p.sourceType,
      confidence,
      status: statusFor(p.livenessEvidence),
      note,
      jd: p.jd,
    }
  })
}
