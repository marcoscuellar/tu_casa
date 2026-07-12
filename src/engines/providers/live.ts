/**
 * Live provider bundle — real jobs from public ATS boards.
 *
 * LIVE this round:
 *   - discovery : real Greenhouse / Lever / Ashby fetch + résumé-driven filter
 *   - jd        : deterministic keyword JD parser (so the rubric scores real
 *                 postings today, no LLM)
 *   - audit     : on-board = confirmed-live; Engine 3 dedupe still runs
 *
 * SEAMS (still fixtures this round, by design):
 *   - resume    : parsed résumé (résumé parse is a stated seam)
 *   - research / reasoning / narrate : the cheat-sheet layer
 *
 * Swapping any seam for a live implementation touches only this file.
 */

import { createLiveDiscovery, type LiveDiscoveryOptions } from '../live/liveDiscovery'
import { parseJDText } from '../live/jdKeywordParser'
import type { RawPosting } from '../discovery'
import type { RecheckSignal } from '../audit'
import type { AuditProvider, JDParseProvider, Providers } from './types'
import { fixtureProviders } from './fixtures'

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

/** Build the live provider bundle. Pass a fetchJson for Node/proxy or tests. */
export function createLiveProviders(opts: LiveDiscoveryOptions = {}): Providers {
  return {
    ...fixtureProviders, // resume / research / reasoning / narrate stay seams
    discovery: createLiveDiscovery(opts),
    audit: liveAudit,
    jd: liveJd,
  }
}

/** Default live providers using the runtime's global fetch. */
export const liveProviders: Providers = createLiveProviders()
