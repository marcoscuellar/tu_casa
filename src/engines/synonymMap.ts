/**
 * Synonym map — "the quietly hardest part" (rubric §Synonym map).
 *
 * canonical → [aliases], all lowercased, punctuation/versions stripped,
 * matched on word boundaries. Genuinely different products are kept separate
 * (MySQL ≠ SQL Server) even when they share a family.
 *
 * Deterministic. In production this base taxonomy is seeded from O*NET/ESCO
 * and an LLM proposes aliases for human review — but matching itself never
 * touches an LLM and never matches raw strings.
 */

const SYNONYMS: Record<string, string[]> = {
  sql: ['t-sql', 'transact-sql'], // generic SQL only
  'sql-server': ['mssql', 'sql server', 'pl/sql'], // separate from generic sql & mysql
  mysql: ['my sql'],
  react: ['react.js', 'reactjs'],
  'react-native': ['react native', 'rn'],
  typescript: ['ts'],
  javascript: ['js', 'ecmascript'],
  gcp: ['google cloud', 'google cloud platform'],
  aws: ['amazon web services'],
  dynamics365: ['d365', 'ms dynamics', 'dynamics crm', 'dynamics 365'],
  'power bi': ['powerbi', 'pbi'],
  k8s: ['kubernetes'],
  'shopify-hydrogen': ['hydrogen', 'shopify hydrogen'],
  'design-systems': ['design system', 'design systems'],
  graphql: ['graph ql'],
  nextjs: ['next.js', 'next js'],
  'node': ['node.js', 'nodejs'],
}

/** alias → canonical, built once. */
const ALIAS_TO_CANONICAL: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    map[canonical] = canonical
    for (const alias of aliases) map[clean(alias)] = canonical
  }
  return map
})()

/**
 * Lowercase, strip version numbers, and collapse punctuation to single spaces.
 * `React 18` → `react`; `Node.js` → `node js` (before alias lookup).
 */
export function clean(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bv?\d+(\.\d+)*\b/g, ' ') // strip standalone version numbers
    .replace(/[._/]+/g, ' ') // punctuation → space (keeps alias spellings comparable)
    .replace(/[^a-z0-9+#\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize a skill string to its canonical form. Idempotent: a value already
 * canonical maps to itself. Unknown skills return their cleaned form (still
 * comparable, just not aliased).
 */
export function toCanonical(raw: string): string {
  const cleaned = clean(raw)
  if (ALIAS_TO_CANONICAL[cleaned]) return ALIAS_TO_CANONICAL[cleaned]
  // also try the hyphenless / spaced variants that appear as canonical keys
  const hyphenated = cleaned.replace(/ /g, '-')
  if (ALIAS_TO_CANONICAL[hyphenated]) return ALIAS_TO_CANONICAL[hyphenated]
  return cleaned
}

/** Two skills match only after both pass through the synonym map. */
export function skillsMatch(a: string, b: string): boolean {
  return toCanonical(a) === toCanonical(b)
}
