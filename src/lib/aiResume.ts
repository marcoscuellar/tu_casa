/**
 * Client for /api/build-resume + the deterministic conversions that let the AI
 * draft rejoin the normal flow. The LLM produced the draft (narrative); turning
 * it into a ParsedResume (for confirm → discovery) and a ResumeDoc (for the
 * from-scratch builder's Download) is pure and deterministic.
 */

import { inferFamily, inferLevel } from '../engines/taxonomy'
import { toCanonical } from '../engines/synonymMap'
import type { ParsedResume, ResumeSkill } from '../engines/types'
import type { AiBuildResult, AiResumeDraft, AiTurn } from '../engines/live/aiResumeBuilder'
import {
  emptyEducation,
  newId,
  type ResumeDoc,
  type ResumeExperience,
} from './resumeDoc'

const NOW_YEAR = new Date().getFullYear()

export async function buildResume(messages: AiTurn[]): Promise<AiBuildResult> {
  const res = await fetch('/api/build-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const data = (await res.json().catch(() => ({}))) as Partial<AiBuildResult> & { error?: string }
  if (!res.ok) throw new Error(data.error || 'The résumé builder is unavailable right now.')
  if (!data.reply || !data.draft) throw new Error('The builder returned an unexpected response.')
  return { reply: data.reply, draft: data.draft }
}

/** Total years — the stated total, or the sum across roles as a fallback. */
function totalYears(draft: AiResumeDraft): number {
  if (draft.years_total > 0) return draft.years_total
  return draft.experience.reduce((s, e) => s + (e.years || 0), 0)
}

/** AI draft → ParsedResume, so it rejoins the confirm → discovery pipeline. */
export function draftToParsedResume(draft: AiResumeDraft): ParsedResume {
  const byCanonical = new Map<string, ResumeSkill>()
  for (const s of draft.skills) {
    const canonical = toCanonical(s)
    if (!canonical || byCanonical.has(canonical)) continue
    byCanonical.set(canonical, { canonical, years: totalYears(draft), last_used_year: NOW_YEAR })
  }
  const headline = draft.headline || 'Professional'
  return {
    titles: [{ raw: headline, family: inferFamily(headline), level: inferLevel(headline) }],
    skills: [...byCanonical.values()],
    years_total: totalYears(draft),
    industries: draft.industries,
    certs_clearances: [],
    location: '',
    onsite_ok: false,
  }
}

/** AI draft → ResumeDoc, for the from-scratch builder's editable preview + Download. */
export function draftToResumeDoc(draft: AiResumeDraft): ResumeDoc {
  const experience: ResumeExperience[] =
    draft.experience.length > 0
      ? draft.experience.map((e) => ({
          id: newId(),
          title: e.title,
          company: '',
          location: '',
          start: '',
          end: e.years ? `${e.years} yrs` : '',
          bullets: e.bullet ? [e.bullet] : [''],
        }))
      : [
          {
            id: newId(),
            title: draft.headline,
            company: '',
            location: '',
            start: '',
            end: '',
            bullets: [''],
          },
        ]
  return {
    name: draft.name,
    headline: draft.headline,
    email: '',
    phone: '',
    location: '',
    links: '',
    summary: '',
    experience,
    skills: draft.skills,
    education: [emptyEducation()],
  }
}
