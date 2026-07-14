/**
 * ResumeDoc — the structured résumé the builder edits and the preview renders.
 *
 * Deterministic and self-contained: the builder mutates this shape, the preview
 * is a pure render of it, and export is just printing that render. Phase 2
 * (tailor-to-a-role) will produce/patch the same shape from a matched job's
 * requirements, so nothing here is throwaway.
 */

import type { ParsedResume } from '../engines/types'

export interface ResumeExperience {
  id: string
  title: string
  company: string
  location: string
  start: string
  end: string
  bullets: string[]
}

export interface ResumeEducation {
  id: string
  school: string
  degree: string
  year: string
}

export interface ResumeDoc {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  links: string
  summary: string
  experience: ResumeExperience[]
  skills: string[]
  education: ResumeEducation[]
}

/** Stable-enough id for list keys (crypto when available). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Math.floor(Math.random() * 1e9).toString(36)}`
}

export function emptyExperience(): ResumeExperience {
  return { id: newId(), title: '', company: '', location: '', start: '', end: '', bullets: [''] }
}

export function emptyEducation(): ResumeEducation {
  return { id: newId(), school: '', degree: '', year: '' }
}

/** Title-case a canonical skill id ("design-systems" → "Design Systems"). */
function prettySkill(canonical: string): string {
  const SPECIAL: Record<string, string> = {
    react: 'React',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    nextjs: 'Next.js',
    node: 'Node.js',
    graphql: 'GraphQL',
    k8s: 'Kubernetes',
  }
  return (
    SPECIAL[canonical] ??
    canonical
      .split('-')
      .map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1))
      .join(' ')
  )
}

export function emptyDoc(): ResumeDoc {
  return {
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    links: '',
    summary: '',
    experience: [emptyExperience()],
    skills: [],
    education: [emptyEducation()],
  }
}

/**
 * Seed a fresh doc from whatever we already know — the signup name/email and,
 * if the candidate uploaded a résumé, the parsed headline/location/skills. The
 * builder is still theirs to edit; this just saves re-typing.
 */
export function seedDoc(opts: {
  resume?: ParsedResume
  name?: string
  email?: string
}): ResumeDoc {
  const doc = emptyDoc()
  doc.name = opts.name?.trim() || ''
  doc.email = opts.email?.trim() || ''
  if (opts.resume) {
    doc.headline = opts.resume.titles[0]?.raw ?? ''
    doc.location = opts.resume.location ?? ''
    doc.skills = opts.resume.skills.map((s) => prettySkill(s.canonical))
  }
  return doc
}

const DOC_KEY = 'tucasa:resumeDoc'

export function loadDoc(): ResumeDoc | null {
  try {
    const raw = localStorage.getItem(DOC_KEY)
    return raw ? (JSON.parse(raw) as ResumeDoc) : null
  } catch {
    return null
  }
}

export function saveDoc(doc: ResumeDoc): void {
  try {
    localStorage.setItem(DOC_KEY, JSON.stringify(doc))
  } catch {
    /* best-effort */
  }
}
