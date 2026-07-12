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

/**
 * Does this posting match the résumé's role family + location?
 *
 * Role family is a hard gate (approved role types). Location follows the
 * "downgrade, don't drop" rule — an onsite role is still *relevant* to an
 * onsite-willing candidate (it's ranked lower downstream, not hidden); only a
 * remote-only candidate excludes a non-local onsite role.
 */
export function isRelevant(resume: ParsedResume, posting: NormalizedPosting): boolean {
  const { families } = searchTermsFrom(resume)
  const postingFamily = parseJDText(posting.role, posting.descriptionText).title.family
  const familyOk = families.some((f) => familyRelated(f, postingFamily))
  return familyOk && locationFit(resume, posting).include
}
