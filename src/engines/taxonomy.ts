/**
 * Shared job-title taxonomy — families, levels, and adjacency.
 *
 * Used by the rubric's Layer 3 (title alignment) and by the live discovery
 * filter / keyword JD parser, so "what counts as the same/adjacent role" is
 * defined in exactly one place.
 */

export const LEVEL_RANK: Record<string, number> = {
  intern: 0,
  junior: 1,
  associate: 1,
  mid: 2,
  senior: 3,
  lead: 4,
  staff: 4,
  manager: 4,
  principal: 5,
  director: 5,
}

/** Undirected adjacency between job families (transferable neighbours). */
export const FAMILY_ADJACENCY: Record<string, string[]> = {
  // engineering
  frontend: ['fullstack', 'mobile'],
  backend: ['fullstack', 'data', 'devops'],
  fullstack: ['frontend', 'backend', 'mobile'],
  mobile: ['frontend', 'fullstack'],
  data: ['backend', 'ml'],
  ml: ['data'],
  devops: ['backend'],
  // non-engineering
  sales: ['marketing', 'customer'],
  marketing: ['sales', 'product'],
  product: ['marketing', 'design'],
  design: ['product'],
  customer: ['sales'],
  operations: [],
  finance: [],
  people: [],
}

export function levelRank(level: string): number {
  return LEVEL_RANK[level.trim().toLowerCase()] ?? 2 // default to mid
}

export function familiesAdjacent(a: string, b: string): boolean {
  const fa = a.trim().toLowerCase()
  const fb = b.trim().toLowerCase()
  return (FAMILY_ADJACENCY[fa] ?? []).includes(fb)
}

/**
 * Same family, or adjacent/transferable. Used to gate "approved role types".
 * 'other' is the "couldn't classify" bucket — it never counts as a family match
 * (otherwise every unclassifiable posting would match every unclassifiable
 * résumé). Those cases fall back to title-word overlap in the discovery filter.
 */
export function familyRelated(a: string, b: string): boolean {
  const fa = a.trim().toLowerCase()
  const fb = b.trim().toLowerCase()
  if (fa === 'other' || fb === 'other') return false
  return fa === fb || familiesAdjacent(fa, fb)
}

/**
 * Infer a job family + level from a free-text posting title.
 * Deterministic keyword match; falls back to a generic family/mid level.
 */
const FAMILY_KEYWORDS: [string, string[]][] = [
  // Engineering (specific first)
  ['frontend', ['front end', 'frontend', 'front-end', 'ui engineer', 'web engineer']],
  ['fullstack', ['full stack', 'fullstack', 'full-stack']],
  ['backend', ['back end', 'backend', 'back-end', 'server', 'platform engineer', 'api engineer']],
  ['mobile', ['mobile', 'ios', 'android', 'react native']],
  ['data', ['data engineer', 'data scientist', 'analytics engineer', 'data science']],
  ['ml', ['machine learning', 'ml engineer', 'ai engineer', 'applied scientist']],
  ['devops', ['devops', 'sre', 'site reliability', 'infrastructure', 'platform reliability']],
  // Non-engineering — checked before the generic "engineer" fallback below.
  ['product', ['product manager', 'product owner', 'head of product', 'director of product', 'vp of product', 'group product']],
  ['marketing', ['marketing', 'growth', 'demand gen', 'brand', 'content', 'seo', 'communications']],
  ['sales', ['sales', 'account executive', 'account manager', 'business development', 'go to market', 'go-to-market', 'gtm', 'revenue', 'partnerships']],
  ['design', ['designer', 'ux', 'ui/ux', 'user experience', 'product design', 'brand design']],
  ['customer', ['customer success', 'customer support', 'account management', 'implementation', 'onboarding']],
  ['operations', ['operations', 'program manager', 'project manager', 'chief of staff', 'business operations', 'strategy']],
  ['finance', ['finance', 'accounting', 'controller', 'fp&a', 'financial analyst', 'treasury']],
  ['people', ['recruiter', 'recruiting', 'talent', 'human resources', 'people operations', 'people ops']],
]

const LEVEL_KEYWORDS: [string, string[]][] = [
  ['principal', ['principal', 'distinguished']],
  ['staff', ['staff']],
  ['lead', ['lead', 'tech lead']],
  ['manager', ['manager', 'head of', 'director']],
  ['senior', ['senior', 'sr.', 'sr ']],
  ['junior', ['junior', 'jr.', 'jr ', 'entry', 'associate', 'new grad', 'graduate']],
]

export function inferFamily(title: string): string {
  const t = title.toLowerCase()
  for (const [family, keys] of FAMILY_KEYWORDS) {
    if (keys.some((k) => t.includes(k))) return family
  }
  // Generic "software engineer" / "engineering manager" etc. → fullstack
  // (broad, adjacent to most eng families).
  if (/\b(software|swe|developer|engineer|engineering|programmer)\b/.test(t)) return 'fullstack'
  return 'other'
}

export function inferLevel(title: string): string {
  const t = ` ${title.toLowerCase()} `
  for (const [level, keys] of LEVEL_KEYWORDS) {
    if (keys.some((k) => t.includes(k))) return level
  }
  return 'mid'
}
