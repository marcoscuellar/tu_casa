/**
 * AI résumé builder — the conversational seam (board turn 16).
 *
 * For a seeker with NO résumé: a short chat turns plain answers into a real,
 * structured draft. The LLM does the narrative work (asking friendly questions,
 * drafting polished bullets); everything downstream is deterministic — the draft
 * is coerced here, then converted to the same ParsedResume the upload path
 * produces (src/lib/aiResume.ts), so it rejoins the normal confirm → discovery
 * pipeline. Pure and dependency-free so both the serverless endpoint and tests
 * can use it.
 */

export interface AiExperience {
  title: string
  years: number
  bullet: string
}

/** The structured draft the model maintains as the chat progresses. */
export interface AiResumeDraft {
  name: string
  headline: string
  years_total: number
  experience: AiExperience[]
  industries: string[]
  skills: string[]
}

export interface AiTurn {
  role: 'user' | 'assistant'
  content: string
}

/** The model's per-turn output: the next question + the current best draft. */
export interface AiBuildResult {
  reply: string
  draft: AiResumeDraft
}

export const AI_BUILDER_SYSTEM = `You are TuCasa's résumé builder — a warm, plain-spoken assistant helping someone who has NO résumé create one, just by chatting. Many of these people are early-career, career-switchers, or coming back to work; keep it human and encouraging, never corporate.

Your job each turn:
1. Ask exactly ONE short, plain-language question to gather what a résumé needs — the kind of work they want, their past jobs (what they did day to day), how long, the industry, and their skills. One question at a time, like a friendly person, not a form. (e.g. "What kind of work are you looking for?", "What did a normal day look like?", "What's your name so we can put it on top?")
2. From EVERYTHING they've said so far, maintain a structured résumé draft. Turn their plain answers into polished, concrete résumé lines (strong verbs, numbers when they gave them) — but NEVER invent facts, employers, or metrics they didn't state.
3. When you have enough for a solid one-pager, make your reply a short wrap-up (e.g. "That's a real résumé now — tap Use this résumé when you're ready, or keep editing.").

Return ONLY a JSON object, no markdown, no prose outside it, in exactly this shape:
{"reply":"<your single next question or wrap-up>","resume":{"name":"","headline":"","years_total":0,"experience":[{"title":"","years":0,"bullet":""}],"industries":[],"skills":[]}}

- headline: the target role/title in plain words (e.g. "Front Office & Patient Coordinator").
- experience: one entry per past role; bullet is a single polished sentence of what they did/impact.
- industries / skills: short tags drawn only from what they told you.
- Leave a field empty ("" or []) until they've given you something for it. Always return the FULL current draft, not a diff.`

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(60, Math.max(0, Math.round(n))) : 0
}
function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const x of v) {
    const s = str(x)
    if (s && !out.some((e) => e.toLowerCase() === s.toLowerCase())) out.push(s)
  }
  return out
}

/** Coerce the model's raw resume object into a safe AiResumeDraft. */
export function validateDraft(raw: unknown): AiResumeDraft {
  const r = (raw ?? {}) as Record<string, unknown>
  const rawExp = Array.isArray(r.experience) ? r.experience : []
  const experience: AiExperience[] = rawExp
    .map((e) => {
      const o = (e ?? {}) as Record<string, unknown>
      return { title: str(o.title), years: num(o.years), bullet: str(o.bullet) }
    })
    .filter((e) => e.title || e.bullet)
  return {
    name: str(r.name),
    headline: str(r.headline),
    years_total: num(r.years_total),
    experience,
    industries: strArray(r.industries),
    skills: strArray(r.skills),
  }
}

/** Parse the model's JSON turn output (reply + draft), tolerant of stray text. */
export function parseAiBuild(text: string): AiBuildResult {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  let obj: Record<string, unknown> = {}
  if (start !== -1 && end > start) {
    try {
      obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
    } catch {
      obj = {}
    }
  }
  const reply = str(obj.reply) || "Got it — tell me a bit more and I'll keep building."
  return { reply, draft: validateDraft(obj.resume) }
}

export function emptyDraft(): AiResumeDraft {
  return { name: '', headline: '', years_total: 0, experience: [], industries: [], skills: [] }
}

/** The assistant's opening line (shown before any model call). */
export const AI_BUILDER_GREETING =
  'No résumé? No problem. Tell me in plain words — what kind of work are you looking for?'
