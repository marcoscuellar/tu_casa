/**
 * Ashby — https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
 * Public job-board API. Returns { jobs: [...] } with plain + HTML descriptions.
 */

import {
  formatMonthYear,
  htmlToText,
  looksRemote,
  type JsonFetcher,
  type NormalizedPosting,
} from './types'

interface AshbyJob {
  id: string
  title?: string
  location?: string
  department?: string
  team?: string
  isListed?: boolean
  isRemote?: boolean
  descriptionHtml?: string
  descriptionPlain?: string
  publishedAt?: string
  jobUrl?: string
  compensation?: { compensationTierSummary?: string }
}
interface AshbyResponse {
  jobs?: AshbyJob[]
}

export function ashbyUrl(slug: string): string {
  return `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`
}

export async function fetchAshby(
  company: string,
  slug: string,
  fetchJson: JsonFetcher,
): Promise<NormalizedPosting[]> {
  const data = (await fetchJson(ashbyUrl(slug))) as AshbyResponse
  const jobs = (data.jobs ?? []).filter((j) => j.isListed !== false)
  return jobs.map((j) => {
    const location = j.location ?? 'Unknown'
    return {
      externalId: j.id,
      company,
      role: j.title ?? 'Unknown',
      location,
      remote: looksRemote(location, j.isRemote),
      url: j.jobUrl ?? '',
      postedDate: formatMonthYear(j.publishedAt),
      salary: j.compensation?.compensationTierSummary || undefined,
      descriptionText: j.descriptionPlain || htmlToText(j.descriptionHtml ?? ''),
    }
  })
}
