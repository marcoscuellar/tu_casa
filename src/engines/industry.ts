/**
 * Deterministic industry matching — "is this the field you actually work in?"
 *
 * Discovery filters by ROLE FAMILY + LOCATION, not domain, so a sales résumé
 * surfaces sales roles at a fintech, a healthtech, a marketplace — all equally.
 * That's why a job seeker can be shown "a financial SaaS company" with no idea
 * why. This module adds the missing signal:
 *
 *   - the candidate's domains come from the résumé (free text, LLM-extracted)
 *   - each job's domain comes from its company (a stable, hand-verified tag —
 *     far more reliable than guessing an industry from posting prose)
 *
 * We canonicalize both sides into the same small tag vocabulary and compare.
 * The rule mirrors location.ts: a match floats the role up, a clear mismatch
 * pushes it down — but we NEVER penalize on missing data. If the résumé doesn't
 * name a concrete domain (only "SaaS" / "Technology"), industry stays neutral
 * and we simply show the field so the candidate can judge for themselves.
 */

/** Canonical industry tags — the shared vocabulary both sides map into. */
export type IndustryTag =
  | 'fintech'
  | 'crypto'
  | 'healthtech'
  | 'devtools'
  | 'data-ai'
  | 'ecommerce'
  | 'social'
  | 'media'
  | 'travel'
  | 'productivity'
  | 'hr-tech'
  | 'martech'
  | 'logistics'
  | 'security'
  | 'iot'
  | 'climate'
  | 'edtech'
  | 'govtech'
  | 'proptech'

/** Human-readable label for the card. */
export const INDUSTRY_LABEL: Record<IndustryTag, string> = {
  fintech: 'Fintech',
  crypto: 'Crypto / Web3',
  healthtech: 'Healthcare',
  devtools: 'Developer tools',
  'data-ai': 'Data / AI',
  ecommerce: 'E-commerce / Retail',
  social: 'Consumer / Social',
  media: 'Media / Entertainment',
  travel: 'Travel / Hospitality',
  productivity: 'Productivity / Collaboration',
  'hr-tech': 'HR / People',
  martech: 'Marketing / Ads',
  logistics: 'Logistics / Supply chain',
  security: 'Security / Infrastructure',
  iot: 'Hardware / IoT',
  climate: 'Climate / Energy',
  edtech: 'Education',
  govtech: 'Government / Public sector',
  proptech: 'Real estate',
}

/**
 * Keyword synonyms for canonicalizing free text (résumé domains, and posting
 * text as a fallback). Ordered most-specific first so an overlapping term lands
 * on the sharper tag. Only concrete DOMAINS live here — generic business-model
 * words ("saas", "software", "b2b", "startup", "enterprise") are deliberately
 * absent so they never fabricate a match or a mismatch.
 */
const INDUSTRY_KEYWORDS: Array<[IndustryTag, string[]]> = [
  ['crypto', ['crypto', 'cryptocurrency', 'blockchain', 'web3', 'defi', 'digital asset', 'nft']],
  ['fintech', [
    'fintech', 'financial', 'finance', 'banking', 'neobank', 'payments', 'payment',
    'lending', 'loan', 'mortgage', 'insurance', 'insurtech', 'trading', 'brokerage',
    'wealth', 'credit', 'accounting', 'treasury', 'capital markets',
  ]],
  ['healthtech', [
    'healthtech', 'healthcare', 'health care', 'clinical', 'biotech', 'pharma',
    'pharmaceutical', 'medical', 'medicine', 'life sciences', 'telehealth',
    'digital health', 'patient', 'hospital', 'genomics',
  ]],
  ['edtech', ['edtech', 'education', 'e-learning', 'learning platform', 'student', 'university', 'k-12', 'tutoring']],
  ['climate', ['climate', 'sustainability', 'clean energy', 'renewable', 'carbon', 'decarbon', 'esg', 'solar', 'cleantech']],
  ['hr-tech', ['hr tech', 'human resources', 'hris', 'payroll', 'people ops', 'recruiting', 'talent acquisition', 'benefits admin', 'workforce']],
  ['martech', ['martech', 'marketing', 'advertising', 'adtech', 'ad tech', 'growth marketing', 'email marketing', 'customer engagement', 'campaign']],
  ['logistics', ['logistics', 'supply chain', 'freight', 'trucking', 'fleet', 'shipping', 'transportation', 'warehouse', 'last mile']],
  ['security', ['cybersecurity', 'cyber security', 'infosec', 'information security', 'network security', 'cloud security', 'zero trust', 'threat', 'firewall']],
  ['iot', ['internet of things', 'iot', 'hardware', 'sensors', 'connected device', 'embedded', 'robotics', 'telematics']],
  ['proptech', ['proptech', 'real estate', 'property', 'housing', 'rental', 'construction']],
  ['govtech', ['govtech', 'government', 'public sector', 'civic', 'defense', 'gov']],
  ['travel', ['travel', 'hospitality', 'tourism', 'lodging', 'airline', 'booking', 'vacation', 'hotels']],
  ['ecommerce', ['e-commerce', 'ecommerce', 'retail', 'marketplace', 'commerce', 'shopping', 'consumer goods', 'dtc', 'direct-to-consumer', 'grocery', 'delivery', 'merchant']],
  ['media', ['media', 'entertainment', 'streaming', 'video', 'gaming', 'games', 'film', 'music', 'publishing', 'content platform']],
  ['social', ['social media', 'social network', 'social platform', 'consumer social', 'community platform', 'creator']],
  ['data-ai', ['machine learning', 'artificial intelligence', 'data platform', 'data warehouse', 'data infrastructure', 'analytics', 'big data', 'mlops', 'data science', 'llm', 'ai']],
  ['devtools', ['developer tools', 'developer platform', 'devtools', 'devops', 'ci/cd', 'api platform', 'developer experience', 'open source', 'software development', 'infrastructure software']],
  ['productivity', ['productivity', 'collaboration', 'workplace software', 'project management', 'note-taking', 'document management', 'team communication']],
]

/** Normalize free text to space-delimited lowercase alphanumerics. */
function norm(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
}

/**
 * Canonicalize one free-text domain string into a tag, or null if unknown.
 * Matches on WORD BOUNDARIES (both sides normalized) so short tokens like "ai"
 * can't hit inside "email", and multi-word phrases like "e-commerce" still work.
 */
export function canonicalizeIndustry(raw: string): IndustryTag | null {
  const s = norm(raw)
  for (const [tag, words] of INDUSTRY_KEYWORDS) {
    for (const w of words) {
      const nw = norm(w).trim()
      if (nw && s.includes(` ${nw} `)) return tag
    }
  }
  return null
}

/** The candidate's known domains as tags (deduped, unknowns dropped). */
export function resumeIndustryTags(industries: string[]): IndustryTag[] {
  const out: IndustryTag[] = []
  for (const raw of industries) {
    const tag = canonicalizeIndustry(raw)
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out
}

/**
 * Best-effort industry from posting/company text — only a FALLBACK for a job
 * whose company carries no explicit tag. Company tags are authoritative.
 */
export function inferIndustryFromText(text: string): IndustryTag | null {
  return canonicalizeIndustry(text)
}

/* ---------- fit ---------- */

// Same scale as location.ts so the two rank adjustments compose sensibly. A
// mismatch (−10) can reorder the tightly-clustered scores without ever
// swamping a real skills gap; a match nudges the same-field role upward.
const SAME_INDUSTRY_BOOST = 6
const CROSS_INDUSTRY_PENALTY = 10

export interface IndustryFit {
  jobIndustry?: IndustryTag
  jobLabel?: string
  match: 'same' | 'different' | 'unknown'
  /** Rank adjustment: negative boosts (same field), positive pushes down. */
  penalty: number
  /** Plain-language note for the card, when there's something to say. */
  note?: string
}

/**
 * Compare the candidate's domains to a job's domain.
 *   - job domain unknown  → neutral (nothing to compare)
 *   - résumé domains unknown → neutral, but surface the job's field
 *   - overlap → same-field boost + positive note
 *   - no overlap → cross-field penalty + cautionary note
 */
export function industryFit(
  resumeTags: IndustryTag[],
  jobIndustry: IndustryTag | undefined,
): IndustryFit {
  if (!jobIndustry) return { match: 'unknown', penalty: 0 }
  const jobLabel = INDUSTRY_LABEL[jobIndustry]

  if (resumeTags.length === 0) {
    // We don't know the candidate's field — show the job's, don't judge it.
    return { jobIndustry, jobLabel, match: 'unknown', penalty: 0 }
  }
  if (resumeTags.includes(jobIndustry)) {
    return {
      jobIndustry,
      jobLabel,
      match: 'same',
      penalty: -SAME_INDUSTRY_BOOST,
      note: `Same field — you've worked in ${jobLabel.toLowerCase()}.`,
    }
  }
  const yours = resumeTags.map((t) => INDUSTRY_LABEL[t]).slice(0, 2).join(' / ')
  return {
    jobIndustry,
    jobLabel,
    match: 'different',
    penalty: CROSS_INDUSTRY_PENALTY,
    note: `Different field — this is ${jobLabel.toLowerCase()}; your background is ${yours.toLowerCase()}.`,
  }
}
