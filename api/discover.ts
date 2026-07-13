/**
 * POST /api/discover — server-side job discovery.
 *
 * Board fetches (Greenhouse / Lever / Ashby) run HERE, server-to-server, not in
 * the browser. That avoids cross-origin (CORS) blocks — several ATS hosts don't
 * send permissive CORS headers, so a browser fetch would be silently dropped —
 * and keeps the company seed list off the client. The rest of the pipeline
 * (Engine 4 audit → Engine 3 dedupe → rubric → rank) still runs client-side on
 * what this returns.
 *
 * Body: { resume: ParsedResume }   →   200 { postings: RawPosting[] }
 * 400 missing/!invalid résumé · 502 discovery failure
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { ParsedResume } from '../src/engines/types'

// Fetching ~40 boards can outrun the default 10s function limit.
export const maxDuration = 60

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Outer guard: never crash opaquely — always return a readable JSON error.
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const resume = (req.body as { resume?: ParsedResume } | undefined)?.resume
    if (!resume || !Array.isArray(resume.titles) || resume.titles.length === 0) {
      res.status(400).json({ error: 'Missing a parsed résumé.' })
      return
    }

    // Lazy-load so any bundling/resolution problem is a readable error, not a crash.
    const { createLiveDiscovery } = await import('../src/engines/live/liveDiscovery')

    // Default fetcher = the runtime's global fetch (server-side, no CORS).
    const discovery = createLiveDiscovery({
      onSkip: (c, reason) => console.warn(`discover: skipped ${c.slug} — ${reason}`),
    })
    const postings = await discovery.findPostings(resume)
    res.status(200).json({ postings })
  } catch (err) {
    console.error('discover failed:', err)
    const message = err instanceof Error ? err.message : 'Job discovery is temporarily unavailable.'
    res.status(500).json({ error: message })
  }
}
