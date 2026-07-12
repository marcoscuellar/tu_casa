/**
 * Live provider bundle — real jobs from public ATS boards.
 *
 * LIVE:
 *   - resume    : Claude parses the uploaded résumé (via /api/parse-resume)
 *   - discovery : real Greenhouse / Lever / Ashby fetch + résumé-driven filter
 *   - jd        : deterministic keyword JD parser (so the rubric scores real
 *                 postings today, no LLM)
 *   - audit     : on-board = confirmed-live; Engine 3 dedupe still runs
 *
 * SEAMS (still fixtures, by design):
 *   - research / reasoning / narrate : the cheat-sheet layer
 *
 * Swapping any seam for a live implementation touches only this file.
 */

import { createLiveDiscovery, type LiveDiscoveryOptions } from '../live/liveDiscovery'
import { parseJDText } from '../live/jdKeywordParser'
import type { RawPosting } from '../discovery'
import type { RecheckSignal } from '../audit'
import type { ParsedResume } from '../types'
import type {
  AuditProvider,
  DiscoveryProvider,
  JDParseProvider,
  Providers,
  ResumeProvider,
} from './types'
import { fixtureProviders } from './fixtures'

/** Live résumé parse: POST the upload to the serverless Claude endpoint. */
const liveResume: ResumeProvider = {
  async parseResume(upload) {
    if (!upload) throw new Error('No résumé uploaded.')
    const res = await fetch('/api/parse-resume', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(upload),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `Couldn’t parse your résumé (${res.status}).`)
    }
    return (await res.json()) as ParsedResume
  },
}

/**
 * Browser discovery: POST the parsed résumé to the serverless proxy, which
 * fetches the ATS boards server-to-server (no CORS) and returns the postings.
 * The rest of the pipeline (audit → dedupe → score → rank) runs client-side.
 */
const httpDiscovery: DiscoveryProvider = {
  async findPostings(resume) {
    const res = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resume }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `Couldn’t load jobs (${res.status}).`)
    }
    const data = (await res.json()) as { postings: RawPosting[] }
    return data.postings ?? []
  },
}

/** Live audit: a posting we just fetched from its own ATS board is live now. */
const liveAudit: AuditProvider = {
  recheck: (jobs: RawPosting[]) =>
    Object.fromEntries(
      jobs.map((j) => [j.id, 'confirmed-live' as RecheckSignal]),
    ),
}

/** Live JD parse: the deterministic keyword parser (LLM parser swaps in later). */
const liveJd: JDParseProvider = {
  parseJobDescription: (text) => parseJDText('', text),
}

/**
 * Build the live provider bundle with DIRECT board fetch (server-to-server):
 * used by the /api/discover function, the CLI, and tests, where there's no CORS
 * and a fetchJson can be injected. The browser must not use this — see below.
 */
export function createLiveProviders(opts: LiveDiscoveryOptions = {}): Providers {
  return {
    ...fixtureProviders, // research / reasoning / narrate stay seams
    resume: liveResume, // résumé parse is now live (Claude via /api/parse-resume)
    discovery: createLiveDiscovery(opts),
    audit: liveAudit,
    jd: liveJd,
  }
}

/**
 * Default live providers for the BROWSER: résumé parsing and job discovery both
 * go through serverless functions (/api/parse-resume, /api/discover), so no key
 * and no cross-origin ATS fetch ever happen client-side.
 */
export const liveProviders: Providers = {
  ...createLiveProviders(),
  discovery: httpDiscovery,
}
