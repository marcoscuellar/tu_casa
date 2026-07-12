/**
 * Lever — https://api.lever.co/v0/postings/{slug}?mode=json
 * Public postings API. Returns an array; description is available as plain text.
 */

import {
  formatMonthYear,
  htmlToText,
  looksRemote,
  type JsonFetcher,
  type NormalizedPosting,
} from './types'

interface LeverList {
  text?: string
  content?: string
}
interface LeverPosting {
  id: string
  text?: string
  categories?: { location?: string; team?: string; commitment?: string }
  descriptionPlain?: string
  description?: string
  lists?: LeverList[]
  additionalPlain?: string
  hostedUrl?: string
  createdAt?: number
  workplaceType?: string
  salaryRange?: { min?: number; max?: number; currency?: string }
}

export function leverUrl(slug: string): string {
  return `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
}

function formatSalary(r?: LeverPosting['salaryRange']): string | undefined {
  if (!r || r.min == null || r.max == null) return undefined
  const k = (n: number) => `$${Math.round(n / 1000)}k`
  return `${k(r.min)}–${k(r.max)}`
}

export async function fetchLever(
  company: string,
  slug: string,
  fetchJson: JsonFetcher,
): Promise<NormalizedPosting[]> {
  const data = (await fetchJson(leverUrl(slug))) as LeverPosting[]
  const postings = Array.isArray(data) ? data : []
  return postings.map((p) => {
    const location = p.categories?.location ?? 'Unknown'
    const listsText = (p.lists ?? [])
      .map((l) => `${l.text ?? ''} ${htmlToText(l.content ?? '')}`)
      .join('\n')
    const description = [
      p.descriptionPlain ?? htmlToText(p.description ?? ''),
      listsText,
      p.additionalPlain ?? '',
    ]
      .filter(Boolean)
      .join('\n')
    return {
      externalId: p.id,
      company,
      role: p.text ?? 'Unknown',
      location,
      remote: looksRemote(location, p.workplaceType?.toLowerCase() === 'remote'),
      url: p.hostedUrl ?? '',
      postedDate: formatMonthYear(p.createdAt),
      salary: formatSalary(p.salaryRange),
      descriptionText: description,
    }
  })
}
