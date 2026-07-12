/**
 * POST /api/parse-resume — server-side résumé parsing with Claude.
 *
 * The Anthropic API key lives here (Vercel env `ANTHROPIC_API_KEY`) and never
 * reaches the browser. Claude does EXTRACTION ONLY, constrained to a JSON schema
 * via structured output; the deterministic validator (validateParsedResume) then
 * normalizes the result and rejects garbage. On any failure we return a clear
 * error — we never invent a résumé.
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
  type ResumeModelCaller,
} from '../src/engines/live/resumeParser'
import type { ResumeUpload } from '../src/engines/types'

// Résumé extraction is a simple task; swap to 'claude-haiku-4-5' to cut cost ~5×.
const MODEL = 'claude-opus-4-8'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' })
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

  // The injected model caller: build the request, return Claude's raw JSON.
  const callModel: ResumeModelCaller = async (input) => {
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
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new ResumeParseError('The model returned no parseable output.')
    }
    return extractJson(textBlock.text)
  }

  try {
    const parsed = await parseResumeWith(upload, callModel)
    res.status(200).json(parsed)
  } catch (err) {
    if (err instanceof ResumeParseError) {
      res.status(422).json({ error: err.message })
      return
    }
    if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: `Résumé service error (${err.status}).` })
      return
    }
    res.status(500).json({ error: 'Unexpected error parsing the résumé.' })
  }
}
