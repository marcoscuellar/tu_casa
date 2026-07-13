/**
 * Location fit — proximity-tiered, "downgrade, don't drop".
 *
 * Remote works for everyone. For an onsite OR hybrid role, distance matters —
 * and it matters MOST for hybrid, because a hybrid role you can't commute to is
 * unworkable, not merely inconvenient. So:
 *   - local (the role is in your city)        → floats to the top (small boost).
 *   - nearby (same region/state)              → kept, small penalty.
 *   - far, and you're open to onsite          → kept, big penalty (ranked low).
 *   - far, and you're remote-only             → excluded (you genuinely can't).
 *
 * The adjustment is a RANKING nudge only (fit.score − penalty); it never touches
 * the displayed rubric score. `penalty` may be negative — that's a boost.
 */

import type { ParsedResume } from './types'

export interface LocationSignal {
  remote: boolean
  location: string
}

export interface LocationFit {
  include: boolean
  /** Rank adjustment (points). Positive = penalty; negative = a local boost. */
  penalty: number
  note?: string
}

const LOCAL_BOOST = 4 // local onsite/hybrid floats just above equal-fit remote
const NEARBY_PENALTY = 8 // same region — a doable commute
const FAR_ONSITE_PENALTY = 14 // far onsite: a one-time relocation you'd consider
const FAR_HYBRID_PENALTY = 24 // far hybrid: an ongoing commute — much heavier

const MODE_WORDS = /\b(remote|hybrid|onsite|on-site|in-office|in office)\b/gi

function isHybrid(location: string): boolean {
  return /\bhybrid\b/i.test(location)
}

/** Comma/bullet-separated segments of a location, minus mode words. */
function segments(loc: string): string[] {
  return loc
    .toLowerCase()
    .replace(MODE_WORDS, ' ')
    .split(/[,•|;/]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function locationFit(resume: ParsedResume, job: LocationSignal): LocationFit {
  const hybrid = isHybrid(job.location)
  // A hybrid role is proximity-bound even if the board also flags it "remote".
  if (job.remote && !hybrid) return { include: true, penalty: 0 }

  const resumeLoc = resume.location.trim().toLowerCase()
  const remotePreferred = resumeLoc === '' || /\bremote\b/.test(resumeLoc)
  const candSegs = remotePreferred ? [] : segments(resume.location)
  const candCity = candSegs[0] ?? ''
  const candRegion = candSegs[1] ?? ''
  const jobSegs = segments(job.location)
  const jobLoc = jobSegs.join(' , ')

  const local = candCity.length >= 3 && jobLoc.includes(candCity)
  const nearby = !local && candRegion.length >= 2 && jobSegs.includes(candRegion)
  const label = hybrid ? 'Hybrid' : 'Onsite'

  // Local — the role is in your city. Floats to the top.
  if (local) {
    return {
      include: true,
      penalty: -LOCAL_BOOST,
      note: hybrid ? 'Hybrid, in your area — close to home.' : undefined,
    }
  }

  // Nearby — same region/state. Kept with a small penalty.
  if (nearby) {
    return {
      include: true,
      penalty: NEARBY_PENALTY,
      note: `${label} near you (${job.location}) — a doable commute.`,
    }
  }

  // Far. Hybrid especially needs regular onsite presence, so it only makes sense
  // if the candidate is open to onsite; a remote-only candidate can't take it.
  if (resume.onsite_ok) {
    return {
      include: true,
      penalty: hybrid ? FAR_HYBRID_PENALTY : FAR_ONSITE_PENALTY,
      note: hybrid
        ? `Hybrid in ${job.location} — far from you; you'd need to be onsite there regularly.`
        : remotePreferred
          ? 'Onsite role — shown because you’re open to onsite, ranked below remote fits.'
          : `Onsite in ${job.location} — outside your area, so it’s ranked lower.`,
    }
  }

  return { include: false, penalty: 0 }
}
