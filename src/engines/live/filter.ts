/**
 * Résumé-driven relevance filter — the search terms come from the résumé, never
 * from a query the candidate types. A posting is relevant when its role family
 * matches (or is adjacent to) the résumé's, and its location works for the
 * candidate. This is the "approved role types + US-usable" gate from Engine 4.
 */

import { locationFit } from '../location'
import { familyRelated } from '../taxonomy'
import type { ParsedResume } from '../types'
import type { NormalizedPosting } from './ats/types'
import { parseJDText } from './jdKeywordParser'

/** The résumé's own family + location drive the search. */
export function searchTermsFrom(resume: ParsedResume): {
  families: string[]
  location: string
  wantsRemote: boolean
} {
  const families = resume.titles.map((t) => t.family.toLowerCase())
  const location = resume.location.trim()
  const wantsRemote = /remote/i.test(location)
  return { families: families.length ? families : ['other'], location, wantsRemote }
}

// Seniority/structure words that say nothing about the *kind* of role, so they
// don't count toward title relevance.
const GENERIC_TITLE_WORDS = new Set([
  'senior', 'sr', 'junior', 'jr', 'staff', 'lead', 'principal', 'director', 'manager',
  'head', 'chief', 'vp', 'president', 'associate', 'intern', 'of', 'and', 'the', 'for',
  'to', 'a', 'an', 'in', 'at', 'i', 'ii', 'iii', 'iv',
  // role suffixes — they say the seniority/shape, not the KIND of work, so two
  // roles sharing only "engineer" or "manager" are not therefore related.
  'engineer', 'engineering', 'developer', 'dev', 'specialist', 'coordinator', 'analyst',
])

/** Distinctive (role-defining) words in a title, minus seniority/filler. */
function distinctiveWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !GENERIC_TITLE_WORDS.has(w)),
  )
}

/** Fallback relevance for unclassifiable roles: do the titles share a real word? */
function titleOverlap(resume: ParsedResume, postingRole: string): boolean {
  const résuméWords = new Set<string>()
  resume.titles.forEach((t) => distinctiveWords(t.raw).forEach((w) => résuméWords.add(w)))
  for (const w of distinctiveWords(postingRole)) {
    if (résuméWords.has(w)) return true
  }
  return false
}

/**
 * Does this posting match the résumé's role family + location?
 *
 * Role family is the primary gate (approved role types). When either side is
 * unclassifiable ('other'), familyRelated returns false, so we fall back to
 * distinctive-word overlap between the titles — that keeps a niche/unusual role
 * matching genuinely-similar postings instead of flooding with everything that
 * also failed to classify. Location follows "downgrade, don't drop".
 */
export function isRelevant(resume: ParsedResume, posting: NormalizedPosting): boolean {
  const { families } = searchTermsFrom(resume)
  const postingFamily = parseJDText(posting.role, posting.descriptionText).title.family
  const familyOk = families.some((f) => familyRelated(f, postingFamily))
  const relevant = familyOk || titleOverlap(resume, posting.role)
  return relevant && locationFit(resume, posting).include
}
