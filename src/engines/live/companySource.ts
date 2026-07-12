/**
 * CompanySourceProvider — the seam for "which companies to pull boards from".
 *
 * Today: the hand-picked seed list. Later: a reasoning step that, given the
 * résumé's title + city, decides which companies are plausibly hiring for it
 * (and could itself call an LLM or a directory). The pipeline only depends on
 * this interface, so that upgrade never touches discovery/audit/scoring.
 */

import type { ParsedResume } from '../types'
import { SEED_COMPANIES, type CompanyRef } from './companies.seed'

export interface CompanySourceProvider {
  /** Companies whose boards to fetch for this candidate. */
  companiesFor(resume: ParsedResume): CompanyRef[]
}

/** Default: return the full seed list (the résumé-aware filter runs downstream). */
export const seedCompanySource: CompanySourceProvider = {
  companiesFor: () => SEED_COMPANIES,
}
