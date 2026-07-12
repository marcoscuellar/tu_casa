/**
 * ATS client layer — fetch a company's public job board and normalize every
 * posting to one shape, regardless of Greenhouse / Lever / Ashby.
 *
 * These are the public, unauthenticated endpoints a company's own careers page
 * already calls. No API key, no scraping, no paid feed.
 */

export type AtsKind = 'greenhouse' | 'lever' | 'ashby'

/** Injected so tests can feed recorded JSON and the app/CLI can use real fetch. */
export type JsonFetcher = (url: string) => Promise<unknown>

/** One posting, normalized across ATS vendors. */
export interface NormalizedPosting {
  externalId: string
  company: string
  role: string
  location: string
  remote: boolean
  url: string
  postedDate: string // "May 2026" or "Unknown"
  salary?: string
  descriptionText: string
}

/** Default JSON fetcher — plain global fetch. Proxy/CA handled by the runtime. */
export const defaultFetcher: JsonFetcher = async (url) => {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

/* ---------- shared helpers ---------- */

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&mdash;': '—',
  '&ndash;': '–',
}

/** Decode common HTML entities and strip tags → readable plain text. */
export function htmlToText(html: string): string {
  if (!html) return ''
  let s = html
  // Decode entities twice: Greenhouse double-encodes (&amp;lt; → &lt; → <).
  for (let pass = 0; pass < 2; pass++) {
    s = s.replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
  }
  return s
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** ISO string or epoch-ms → "May 2026"; anything unparseable → "Unknown". */
export function formatMonthYear(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return 'Unknown'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** Heuristic: does this location / flag read as remote? */
export function looksRemote(location: string, flag?: boolean): boolean {
  if (flag === true) return true
  return /\bremote\b/i.test(location || '')
}
