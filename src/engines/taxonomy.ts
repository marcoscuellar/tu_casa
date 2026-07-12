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
  frontend: ['fullstack', 'mobile'],
  backend: ['fullstack', 'data', 'devops'],
  fullstack: ['frontend', 'backend', 'mobile'],
  mobile: ['frontend', 'fullstack'],
  data: ['backend', 'ml'],
  ml: ['data'],
  devops: ['backend'],
}

export function levelRank(level: string): number {
  return LEVEL_RANK[level.trim().toLowerCase()] ?? 2 // default to mid
}

export function familiesAdjacent(a: string, b: string): boolean {
  const fa = a.trim().toLowerCase()
  const fb = b.trim().toLowerCase()
  return (FAMILY_ADJACENCY[fa] ?? []).includes(fb)
}

/** Same family, or adjacent/transferable. Used to gate "approved role types". */
export function familyRelated(a: string, b: string): boolean {
  const fa = a.trim().toLowerCase()
  const fb = b.trim().toLowerCase()
  return fa === fb || familiesAdjacent(fa, fb)
}

/**
 * Infer a job family + level from a free-text posting title.
 * Deterministic keyword match; falls back to a generic family/mid level.
 */
const FAMILY_KEYWORDS: [string, string[]][] = [
  ['frontend', ['front end', 'frontend', 'front-end', 'ui engineer', 'web engineer']],
  ['fullstack', ['full stack', 'fullstack', 'full-stack']],
  ['backend', ['back end', 'backend', 'back-end', 'server', 'platform engineer', 'api engineer']],
  ['mobile', ['mobile', 'ios', 'android', 'react native']],
  ['data', ['data engineer', 'data scientist', 'analytics engineer', 'data science']],
  ['ml', ['machine learning', 'ml engineer', 'ai engineer', 'applied scientist']],
  ['devops', ['devops', 'sre', 'site reliability', 'infrastructure', 'platform reliability']],
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
  // Generic "software engineer" etc. → treat as fullstack (broad, adjacent to most).
  if (/\b(software|swe|developer|engineer|programmer)\b/.test(t)) return 'fullstack'
  return 'other'
}

export function inferLevel(title: string): string {
  const t = ` ${title.toLowerCase()} `
  for (const [level, keys] of LEVEL_KEYWORDS) {
    if (keys.some((k) => t.includes(k))) return level
  }
  return 'mid'
}
