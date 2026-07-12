/**
 * Engine 3 — Job Audit · SEEKER MODE (ENGINE_3_Job_Audit_SEEKER_MODE.md)
 *
 * The independent second pass. The live re-check is a provider seam; this file
 * is the deterministic audit logic the spec mandates:
 *   - Dedupe: collapse the same real job posted in many places into one.
 *   - VERIFIED — confirmed real & live → shows clean.
 *   - FLAGGED (the default on doubt) — probably real, couldn't confirm liveness
 *     → shown lower with a plain "verify this one" note. NOT dropped.
 *   - DEAD — positively confirmed closed/filled/fake → the ONLY removal path.
 *
 * "Still open", not "posted recently": age never decides an opening's fate here.
 */

import type {
  AuditResult,
  AuditedJob,
  Confidence,
  DiscoveredJob,
  RecheckStatus,
  StillOpen,
} from './types'

/** Independent re-check signal per job (from the audit provider). */
export type RecheckSignal = 'confirmed-live' | 'confirmed-dead' | 'uncertain'

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Same real job = same company + same role (location/source ignored for identity). */
function dedupeKey(job: DiscoveredJob): string {
  return `${normalize(job.company)}::${normalize(job.role)}`
}

const SOURCE_RANK: Record<DiscoveredJob['sourceType'], number> = {
  'company-ats': 0,
  'aggregator-corroborated': 1,
  'aggregator-only': 2,
}

/** Pick the strongest representative of a duplicate group (best source wins). */
function chooseSurvivor(group: DiscoveredJob[]): DiscoveredJob {
  return [...group].sort((a, b) => {
    const s = SOURCE_RANK[a.sourceType] - SOURCE_RANK[b.sourceType]
    if (s !== 0) return s
    return a.id.localeCompare(b.id) // deterministic tie-break
  })[0]
}

function mapSignal(
  signal: RecheckSignal,
  discovered: DiscoveredJob,
): { recheck: RecheckStatus; stillOpen: StillOpen; confidence: Confidence; note?: string } {
  switch (signal) {
    case 'confirmed-dead':
      return { recheck: 'dead', stillOpen: 'no-confirmed', confidence: 'flagged-verify' }
    case 'confirmed-live':
      return { recheck: 'verified', stillOpen: 'yes', confidence: 'verified' }
    case 'uncertain':
    default:
      // Default on doubt: downgrade + flag, never drop. A flagged row always
      // states why, in plain language the candidate can act on.
      return {
        recheck: 'flagged',
        stillOpen: 'unknown',
        confidence: 'flagged-verify',
        note:
          discovered.note ??
          'Couldn’t confirm this is still open — quick to double-check before you apply.',
      }
  }
}

export interface AuditOutput {
  survivors: AuditedJob[]
  dropped: AuditResult[] // confirmed-dead only
  duplicates: AuditResult[] // collapsed into a survivor
}

/**
 * Audit discovered jobs against independent re-check signals.
 * Returns survivors (VERIFIED + FLAGGED), plus what was dropped/deduped and why.
 * Only confirmed-DEAD jobs leave the pipeline; duplicates collapse into one.
 */
export function runAudit(
  jobs: DiscoveredJob[],
  signals: Record<string, RecheckSignal>,
): AuditOutput {
  // 1. Dedupe — group by identity, keep the strongest source as survivor.
  const groups = new Map<string, DiscoveredJob[]>()
  for (const job of jobs) {
    const key = dedupeKey(job)
    const g = groups.get(key)
    if (g) g.push(job)
    else groups.set(key, [job])
  }

  const survivors: AuditedJob[] = []
  const dropped: AuditResult[] = []
  const duplicates: AuditResult[] = []

  for (const group of groups.values()) {
    const survivor = chooseSurvivor(group)
    for (const dup of group) {
      if (dup.id === survivor.id) continue
      duplicates.push({
        jobId: dup.id,
        recheck: 'verified',
        stillOpen: 'unknown',
        confidence: dup.confidence,
        duplicateOf: survivor.id,
        note: 'Same posting as another listing — collapsed.',
      })
    }

    // 2. Independent re-check of the survivor.
    const signal = signals[survivor.id] ?? 'uncertain'
    const mapped = mapSignal(signal, survivor)
    const audit: AuditResult = { jobId: survivor.id, ...mapped }

    if (mapped.recheck === 'dead') {
      dropped.push(audit) // the only removal path
      continue
    }
    survivors.push({ ...survivor, confidence: mapped.confidence, audit })
  }

  return { survivors, dropped, duplicates }
}
