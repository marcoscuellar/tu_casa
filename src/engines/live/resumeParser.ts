/**
 * Live résumé parsing — the last provider seam.
 *
 * The LLM (Claude) does EXTRACTION ONLY: it reads the résumé and returns raw
 * fields as structured JSON. Everything downstream of that is deterministic:
 *   - skills are normalized through the synonym map (canonical ids)
 *   - each title's family/level is RE-DERIVED from our taxonomy, not trusted
 *     from the model
 *   - all fields are type-coerced and clamped
 *   - a missing/garbage required field throws — we never fabricate a résumé
 *
 * The model call is injected (`ResumeModelCaller`), so this whole file is pure
 * and unit-testable with a mock — no API key, no network. The real caller lives
 * in api/parse-resume.ts (server-side, key never reaches the browser).
 */

import { toCanonical } from '../synonymMap'
import { inferFamily, inferLevel } from '../taxonomy'
import type { ParsedResume, ResumeSkill, ResumeTitle, ResumeUpload } from '../types'

/** JSON schema for structured output — Claude is constrained to this shape. */
export const RESUME_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    titles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { raw: { type: 'string' } },
        required: ['raw'],
      },
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          years: { type: 'number' },
          last_used_year: { type: 'integer' },
        },
        required: ['name', 'years', 'last_used_year'],
      },
    },
    years_total: { type: 'number' },
    industries: { type: 'array', items: { type: 'string' } },
    certs_clearances: { type: 'array', items: { type: 'string' } },
    location: { type: 'string' },
    onsite_ok: { type: 'boolean' },
  },
  required: [
    'titles',
    'skills',
    'years_total',
    'industries',
    'certs_clearances',
    'location',
    'onsite_ok',
  ],
} as const

/** Instruction sent alongside the résumé. Extraction only — no scoring, no invention. */
export const RESUME_PARSE_PROMPT = `You are extracting structured data from a job seeker's résumé. Return ONLY the fields in the schema — do not infer, embellish, or invent anything that isn't supported by the résumé text.

Guidelines:
- titles: the person's job titles, most recent first, each as its raw text (e.g. "Senior Frontend Engineer"). Do not classify or rename them.
- skills: concrete technical skills, tools, and languages the résumé shows. For each, give name (as written), years of experience with it, and last_used_year (the most recent year they used it; use the résumé's dates). If a year isn't stated, estimate conservatively from context.
- years_total: total years of professional experience.
- industries: industries/domains they've worked in.
- certs_clearances: any certifications, licenses, or security clearances (e.g. "AWS Solutions Architect", "RN license", "TS/SCI"). Empty array if none.
- location: their location as stated, or "Remote" if they indicate remote preference, or "" if unknown.
- onsite_ok: true if they indicate willingness to work onsite/relocate; false if remote-only or unstated.

If the document is not a résumé or is unreadable, return empty titles and skills arrays.

Return ONLY a JSON object — no markdown, no code fences, no prose — in exactly this shape:
{"titles":[{"raw":"..."}],"skills":[{"name":"...","years":0,"last_used_year":2026}],"years_total":0,"industries":["..."],"certs_clearances":["..."],"location":"...","onsite_ok":false}`

/**
 * Extract a JSON object from model text — tolerant of code fences or stray
 * prose (the deterministic validator still guards the parsed result).
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new ResumeParseError('The model did not return JSON.')
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    throw new ResumeParseError('The model returned invalid JSON.')
  }
}

/* ------------------------- deterministic validation ------------------------- */

/** The raw shape the model returns (pre-normalization). */
interface RawResume {
  titles?: unknown
  skills?: unknown
  years_total?: unknown
  industries?: unknown
  certs_clearances?: unknown
  location?: unknown
  onsite_ok?: unknown
}

export class ResumeParseError extends Error {}

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((x) => x.length > 0)
}

/**
 * Normalize and validate the model's raw output into a ParsedResume.
 * Throws ResumeParseError when the résumé couldn't be read (no fabrication).
 */
export function validateParsedResume(
  raw: unknown,
  opts: { asOfYear?: number } = {},
): ParsedResume {
  const asOfYear = opts.asOfYear ?? new Date().getFullYear()
  if (!raw || typeof raw !== 'object') {
    throw new ResumeParseError('Could not read the résumé — no data returned.')
  }
  const r = raw as RawResume

  // Titles — family/level are DERIVED here, never trusted from the model.
  const rawTitles = Array.isArray(r.titles) ? r.titles : []
  const titles: ResumeTitle[] = rawTitles
    .map((t): ResumeTitle | null => {
      const text =
        t && typeof t === 'object' && typeof (t as { raw?: unknown }).raw === 'string'
          ? (t as { raw: string }).raw.trim()
          : typeof t === 'string'
            ? t.trim()
            : ''
      if (!text) return null
      return { raw: text, family: inferFamily(text), level: inferLevel(text) }
    })
    .filter((t): t is ResumeTitle => t !== null)

  if (titles.length === 0) {
    throw new ResumeParseError(
      'Couldn’t read a job title from that file — is it a résumé? Try a PDF or text résumé.',
    )
  }

  // Skills — normalized through the synonym map, deduped by canonical id.
  const rawSkills = Array.isArray(r.skills) ? r.skills : []
  const byCanonical = new Map<string, ResumeSkill>()
  for (const s of rawSkills) {
    if (!s || typeof s !== 'object') continue
    const name = (s as { name?: unknown }).name
    if (typeof name !== 'string' || !name.trim()) continue
    const canonical = toCanonical(name)
    const years = num((s as { years?: unknown }).years, 0, 60, 0)
    const lastUsed = Math.round(
      num((s as { last_used_year?: unknown }).last_used_year, 1970, asOfYear, asOfYear),
    )
    const existing = byCanonical.get(canonical)
    if (!existing) {
      byCanonical.set(canonical, { canonical, years, last_used_year: lastUsed })
    } else {
      // Keep the strongest signal: more years, more recent use.
      existing.years = Math.max(existing.years, years)
      existing.last_used_year = Math.max(existing.last_used_year, lastUsed)
    }
  }
  const skills = [...byCanonical.values()]

  const locationRaw = typeof r.location === 'string' ? r.location.trim() : ''

  return {
    titles,
    skills,
    years_total: Math.round(num(r.years_total, 0, 60, 0)),
    industries: stringArray(r.industries),
    certs_clearances: stringArray(r.certs_clearances),
    location: locationRaw,
    onsite_ok: r.onsite_ok === true,
  }
}

/* ------------------------------- orchestration ------------------------------ */

/** Injected model call: résumé in, raw extracted JSON out. */
export type ResumeModelCaller = (input: ResumeUpload) => Promise<unknown>

/** Parse a résumé: model extraction + deterministic validation. */
export async function parseResumeWith(
  input: ResumeUpload,
  callModel: ResumeModelCaller,
  opts: { asOfYear?: number } = {},
): Promise<ParsedResume> {
  const raw = await callModel(input)
  return validateParsedResume(raw, opts)
}
