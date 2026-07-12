/**
 * Location fit — "downgrade, don't drop", the same philosophy Engines 3 & 4 use.
 *
 * A remote role works for everyone. An onsite role:
 *   - in the candidate's own city → full (no penalty).
 *   - elsewhere, but the candidate is willing to go onsite (onsite_ok) → KEPT,
 *     just ranked lower. It's a job they might actually take; hiding it would
 *     contradict the rest of the app.
 *   - elsewhere, and the candidate is remote-only (not onsite_ok) → excluded.
 *     That's the one genuine exclusion — they can't take it.
 *
 * The penalty is a relevance nudge applied at RANKING time; it never touches the
 * rubric fit score (which measures résumé↔role fit, not geography).
 */

import type { ParsedResume } from './types'

export interface LocationSignal {
  remote: boolean
  location: string
}

export interface LocationFit {
  include: boolean
  /** Rank penalty (points) for an onsite role a remote-preferrer would take. */
  penalty: number
  note?: string
}

/** Onsite roles for a remote-preferring candidate rank ~a skill-tier below. */
const ONSITE_PENALTY = 12

export function locationFit(resume: ParsedResume, job: LocationSignal): LocationFit {
  if (job.remote) return { include: true, penalty: 0 }

  const resumeLoc = resume.location.trim().toLowerCase()
  const remotePreferred = resumeLoc === '' || resumeLoc.includes('remote')
  const city = remotePreferred ? '' : resumeLoc
  const cityMatch = !!city && job.location.toLowerCase().includes(city)

  // Onsite in the candidate's own city → full fit.
  if (cityMatch) return { include: true, penalty: 0 }

  // Onsite elsewhere: keep it if they're open to onsite, just ranked lower.
  if (resume.onsite_ok) {
    return {
      include: true,
      penalty: ONSITE_PENALTY,
      note: remotePreferred
        ? 'Onsite role — shown because you’re open to onsite, ranked below remote fits.'
        : `Onsite in ${job.location} — outside your area, so it’s ranked lower.`,
    }
  }

  // Remote-only and not local → they genuinely can't take it.
  return { include: false, penalty: 0 }
}
