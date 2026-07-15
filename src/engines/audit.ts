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
  DuplicatePosting,
  RecheckStatus,
  StillOpen,
} from './types'

/** Independent re-check signal per job (from the audit provider). */
export type RecheckSignal = 'confirmed-live' | 'confirmed-dead' | 'uncertain'

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Canonical title: expand sr/jr, drop parentheticals and punctuation. Kept
 * conservative — seniority words stay, so "Senior X" ≠ "X".
 */
function normalizeTitle(role: string): string {
  return normalize(role)
    .replace(/\bsr\.?\b/g, 'senior')
    .replace(/\bjr\.?\b/g, 'junior')
    .replace(/\([^)]*\)/g, ' ') // "(Remote)", "(Contract)" → gone
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Canonical location: any remote signal collapses to "remote"; otherwise the
 * first city segment, so "San Francisco, CA" and "San Francisco" match but two
 * genuinely different cities stay distinct.
 */
function normalizeLocation(location: string, remote: boolean): string {
  if (remote || /\bremote\b/i.test(location)) return 'remote'
  const first = location.split(/[;|/,]/)[0] ?? location
  return (
    normalize(first)
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'unknown'
  )
}

/** Identity key: same company + title + location = candidate for the same job. */
function dedupeKey(job: DiscoveredJob): string {
  return `${normalize(job.company)}::${normalizeTitle(job.role)}::${normalizeLocation(
    job.location,
    job.remote,
  )}`
}

/** Content-word set for description similarity (skip short/common tokens). */
function tokenSet(text: string): Set<string> {
  const set = new Set<string>()
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length >= 4) set.add(w)
  }
  return set
}

/** Jaccard overlap of two descriptions' content words (0 when either is empty). */
export function descriptionSimilarity(a?: string, b?: string): number {
  if (!a || !b) return 0
  const A = tokenSet(a)
  const B = tokenSet(b)
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

/** Descriptions at/above this overlap read as "the same posting". */
const SIMILARITY_THRESHOLD = 0.72

/**
 * Within an identity group, split into clusters of the SAME job. Two postings
 * cluster together when their descriptions are highly similar — OR when a
 * description is missing (identity match alone is strong enough to collapse).
 * Guards the rare case of two distinct reqs sharing company+title+location.
 */
function clusterBySimilarity(group: DiscoveredJob[]): DiscoveredJob[][] {
  const clusters: DiscoveredJob[][] = []
  for (const job of group) {
    let placed = false
    for (const cluster of clusters) {
      const rep = cluster[0]
      const bothHaveDesc = Boolean(job.description && rep.description)
      const same =
        !bothHaveDesc ||
        descriptionSimilarity(job.description, rep.description) >= SIMILARITY_THRESHOLD
      if (same) {
        cluster.push(job)
        placed = true
        break
      }
    }
    if (!placed) clusters.push([job])
  }
  return clusters
}

const SOURCE_RANK: Record<DiscoveredJob['sourceType'], number> = {
  'company-ats': 0,
  'aggregator-corroborated': 1,
  'aggregator-only': 2,
}

/** Trimmed description length — the "richness" signal for survivor choice. */
function descLength(job: DiscoveredJob): number {
  return (job.description ?? '').replace(/\s+/g, ' ').trim().length
}

/** Posting timestamp for "newest wins"; unparseable/"Unknown" sorts oldest. */
function dateValue(d: string): number {
  const t = Date.parse(d)
  return Number.isNaN(t) ? -Infinity : t
}

/** A where-posted label from the link host, for the grouping note. */
function hostLabel(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return 'another listing'
  }
}

/**
 * Pick the strongest representative of a duplicate cluster:
 * authoritative source first (company ATS = best apply link), then the richest
 * description, then the newest date — deterministic id tie-break last.
 */
function chooseSurvivor(cluster: DiscoveredJob[]): DiscoveredJob {
  return [...cluster].sort((a, b) => {
    const s = SOURCE_RANK[a.sourceType] - SOURCE_RANK[b.sourceType]
    if (s !== 0) return s
    const d = descLength(b) - descLength(a)
    if (d !== 0) return d
    const t = dateValue(b.postedDate) - dateValue(a.postedDate)
    if (t !== 0) return t
    return a.id.localeCompare(b.id)
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
  // 1. Dedupe — group by identity (company + title + location), then split each
  //    group into same-job clusters by description similarity.
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
    for (const cluster of clusterBySimilarity(group)) {
      const survivor = chooseSurvivor(cluster)
      const others = cluster.filter((j) => j.id !== survivor.id)
      for (const dup of others) {
        duplicates.push({
          jobId: dup.id,
          recheck: 'verified',
          stillOpen: 'unknown',
          confidence: dup.confidence,
          duplicateOf: survivor.id,
          note: 'Same posting as another listing — collapsed.',
        })
      }

      // "Also posted on N other sites" — the collapsed listings, newest source
      // labels first isn't needed; keep discovery order, dedupe by host label.
      const alsoPostedOn: DuplicatePosting[] = others.map((o) => ({
        id: o.id,
        link: o.link,
        sourceType: o.sourceType,
        label: hostLabel(o.link),
      }))

      // 2. Independent re-check of the survivor.
      const signal = signals[survivor.id] ?? 'uncertain'
      const mapped = mapSignal(signal, survivor)
      const audit: AuditResult = { jobId: survivor.id, ...mapped }

      if (mapped.recheck === 'dead') {
        dropped.push(audit) // the only removal path
        continue
      }
      survivors.push({
        ...survivor,
        confidence: mapped.confidence,
        audit,
        ...(alsoPostedOn.length > 0 ? { alsoPostedOn } : {}),
      })
    }
  }

  return { survivors, dropped, duplicates }
}
