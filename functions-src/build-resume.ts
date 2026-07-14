/**
 * POST /api/build-resume — the AI résumé builder's chat turn (board turn 16).
 *
 * Takes the conversation so far and returns the assistant's next question plus
 * the current structured draft (recomputed from the whole chat each turn — the
 * seam is stateless and deterministic to re-run). The Anthropic key stays here,
 * never in the browser. Any failure returns a readable JSON error.
 *
 * Body: { messages: {role:'user'|'assistant', content:string}[] }
 * 200 → { reply, draft } · 400 bad request · 500 server/LLM
 */

import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AI_BUILDER_SYSTEM, parseAiBuild, type AiTurn } from '../src/engines/live/aiResumeBuilder'

const MODEL = 'claude-opus-4-8'
export const maxDuration = 60

function readApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY ?? process.env.API_ANTHROPIC_KEY
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    const apiKey = readApiKey()
    if (!apiKey) {
      res.status(500).json({ error: 'Server is missing the Anthropic API key.' })
      return
    }

    const body = req.body as { messages?: AiTurn[] } | undefined
    const messages = Array.isArray(body?.messages) ? body!.messages : []
    const clean = messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    if (clean.length === 0 || clean[clean.length - 1].role !== 'user') {
      res.status(400).json({ error: 'Send the conversation with a final user message.' })
      return
    }

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: AI_BUILDER_SYSTEM,
      messages: clean,
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      res.status(502).json({ error: 'The builder returned no output.' })
      return
    }
    res.status(200).json(parseAiBuild(textBlock.text))
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      res.status(502).json({ error: `Builder service error (${err.status}): ${err.message}` })
      return
    }
    const msg = err instanceof Error ? err.message : 'Unexpected error building the résumé.'
    res.status(500).json({ error: msg })
  }
}
