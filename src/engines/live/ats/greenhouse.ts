/**
 * Greenhouse — https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
 * Public board API. `content=true` includes the (HTML-entity-encoded) description.
 */

import {
  formatMonthYear,
  htmlToText,
  looksRemote,
  type JsonFetcher,
  type NormalizedPosting,
} from './types'

interface GhJob {
  id: number
  title: string
  updated_at?: string
  location?: { name?: string }
  content?: string
  absolute_url?: string
}
interface GhResponse {
  jobs?: GhJob[]
}

export function greenhouseUrl(slug: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`
}

export async function fetchGreenhouse(
  company: string,
  slug: string,
  fetchJson: JsonFetcher,
): Promise<NormalizedPosting[]> {
  const data = (await fetchJson(greenhouseUrl(slug))) as GhResponse
  const jobs = data.jobs ?? []
  return jobs.map((j) => {
    const location = j.location?.name ?? 'Unknown'
    return {
      externalId: String(j.id),
      company,
      role: j.title ?? 'Unknown',
      location,
      remote: looksRemote(location),
      url: j.absolute_url ?? '',
      postedDate: formatMonthYear(j.updated_at),
      descriptionText: htmlToText(j.content ?? ''),
    }
  })
}
