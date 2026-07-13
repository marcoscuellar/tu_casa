/**
 * POST /api/parse-resume — server-side résumé parsing with Claude.
 *
 * The Anthropic API key lives here (Vercel env) and never reaches the browser.
 * Claude does EXTRACTION ONLY; the deterministic validator (validateParsedResume)
 * then normalizes the result and rejects garbage. On any failure we return a
 * clear JSON error — we never invent a résumé, and never crash opaquely.
 *
 * Body: { kind: 'text', text } | { kind: 'pdf', base64, filename? }
 * 200 → ParsedResume · 400 bad request · 422 unreadable résumé · 500 server/LLM
 */

import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  extractJson,
  parseResumeWith,
  RESUME_PARSE_PROMPT,
  ResumeParseError,
} from '../src/engines/live/resumeParser'
import type { ResumeUpload } from '../src/engines/types'

// Résumé extraction is a simple task; swap to 'claude-haiku-4-5' to cut cost ~5×.
const MODEL = 'claude-opus-4-8'

// A large PDF parse can exceed the default 10s function limit.
export const maxDuration = 60

/** Accept either spelling of the key so a naming slip doesn't silently break it. */
function readApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY ?? process.env.API_ANTHROPIC_KEY
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // One outer guard: any unexpected error becomes a readable JSON message
  // instead of an opaque FUNCTION_INVOCATION_FAILED crash.
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const apiKey = readApiKey()
    if (!apiKey) {
      res
        .status(500)
        .json({ error: 'Server is missing the Anthropic API key (set ANTHROPIC_API_KEY).' })
      return
    }

    const upload = req.body as ResumeUpload | undefined
    const hasText = upload?.kind === 'text' && typeof upload.text === 'string' && upload.text.trim()
    const hasPdf = upload?.kind === 'pdf' && typeof upload.base64 === 'string' && upload.base64
    if (!upload || (!hasText && !hasPdf)) {
      res.status(400).json({ error: 'Provide a résumé as { kind: "text", text } or { kind: "pdf", base64 }.' })
      return
    }

    const client = new Anthropic({ apiKey })

    const callModel = async (input: ResumeUpload): Promise<unknown> => {
      const content =
        input.kind === 'pdf'
          ? [
              {
                type: 'document' as const,
                source: {
                  type: 'base64' as const,
                  media_type: 'application/pdf' as const,
                  data: input.base64!,
                },
              },
              { type: 'text' as const, text: RESUME_PARSE_PROMPT },
            ]
          : [{ type: 'text' as const, text: `${RESUME_PARSE_PROMPT}\n\nRÉSUMÉ:\n${input.text}` }]

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 8000, // room for a thorough, skill-heavy extraction
        messages: [{ role: 'user', content }],
      })

      const textBlock = message.content.find((b) => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new ResumeParseError('The model returned no parseable output.')
      }
      return extractJson(textBlock.text)
    }

    try {
      // allowIncomplete: return whatever Claude extracted (even without a title)
      // so the client's "confirm your info" step can fill any gaps.
      const parsed = await parseResumeWith(upload, callModel, { allowIncomplete: true })
      res.status(200).json(parsed)
    } catch (err) {
      if (err instanceof ResumeParseError) {
        res.status(422).json({ error: err.message })
        return
      }
      if (err instanceof Anthropic.APIError) {
        res.status(502).json({ error: `Résumé service error (${err.status}): ${err.message}` })
        return
      }
      throw err
    }
  } catch (err) {
    // Last-resort: return the real message so the UI shows something actionable.
    const message = err instanceof Error ? err.message : 'Unexpected error parsing the résumé.'
    res.status(500).json({ error: message })
  }
}
