/**
 * Live discovery — the résumé-in → real-postings-out front of the pipeline.
 *
 *   company seed → fetch each ATS board → normalize → filter to the résumé's
 *   role family + location → map to RawPosting (parsed JD via keyword parser).
 *
 * Everything downstream (Engine 4 validate → Engine 3 audit → rubric → rank) is
 * unchanged. Failed boards (renamed slug, network) are skipped, never fatal.
 */

import type { DiscoveryProvider } from '../providers/types'
import type { ParsedResume } from '../types'
import type { RawPosting } from '../discovery'
import { fetchAshby } from './ats/ashby'
import { fetchGreenhouse } from './ats/greenhouse'
import { fetchLever } from './ats/lever'
import { defaultFetcher, type JsonFetcher, type NormalizedPosting } from './ats/types'
import { seedCompanySource, type CompanySourceProvider } from './companySource'
import type { CompanyRef } from './companies.seed'
import { isRelevant } from './filter'
import { parseJDText } from './jdKeywordParser'

export interface LiveDiscoveryOptions {
  companySource?: CompanySourceProvider
  fetchJson?: JsonFetcher
  /** Optional sink for skipped-board diagnostics (renamed slug, network, etc.). */
  onSkip?: (company: CompanyRef, reason: string) => void
}

async function fetchBoard(
  c: CompanyRef,
  fetchJson: JsonFetcher,
): Promise<NormalizedPosting[]> {
  if (c.ats === 'greenhouse') return fetchGreenhouse(c.name, c.slug, fetchJson)
  if (c.ats === 'lever') return fetchLever(c.name, c.slug, fetchJson)
  return fetchAshby(c.name, c.slug, fetchJson)
}

/** Turn a normalized posting into a RawPosting for Engine 4 (JD parsed inline). */
function toRawPosting(c: CompanyRef, p: NormalizedPosting): RawPosting {
  return {
    id: `${c.ats}:${c.slug}:${p.externalId}`,
    company: p.company,
    role: p.role,
    location: p.location,
    remote: p.remote,
    link: p.url,
    postedDate: p.postedDate,
    salary: p.salary,
    // It's currently listed on the company's own ATS → that IS the liveness
    // confirmation. One authoritative source is enough (Engine 4 spec).
    sourceType: 'company-ats',
    livenessEvidence: 'confirmed-open',
    jd: parseJDText(p.role, p.descriptionText),
  }
}

/** Build a DiscoveryProvider that pulls real ATS boards for the résumé. */
export function createLiveDiscovery(
  opts: LiveDiscoveryOptions = {},
): DiscoveryProvider {
  const companySource = opts.companySource ?? seedCompanySource
  const fetchJson = opts.fetchJson ?? defaultFetcher

  return {
    async findPostings(resume: ParsedResume): Promise<RawPosting[]> {
      const companies = companySource.companiesFor(resume)
      const boards = await Promise.allSettled(
        companies.map((c) => fetchBoard(c, fetchJson)),
      )

      const raw: RawPosting[] = []
      boards.forEach((result, i) => {
        const c = companies[i]
        if (result.status === 'rejected') {
          opts.onSkip?.(c, String(result.reason?.message ?? result.reason))
          return
        }
        for (const p of result.value) {
          if (isRelevant(resume, p)) raw.push(toRawPosting(c, p))
        }
      })
      return raw
    },
  }
}
