/**
 * /api/user-store — per-user persistence backed by Vercel KV (Upstash Redis).
 *
 * Stores the two things the discovery screen tracks, keyed by the signed-in
 * email, so they follow the user across devices instead of living only in one
 * browser's localStorage:
 *   - applied : string[]      (job ids the user marked as applied)
 *   - saved   : SavedJob[]    (snapshots of the shortlist they saved)
 *
 * Talks to KV over its REST API with plain fetch — no SDK dependency. If the KV
 * env vars aren't set (store not connected yet), every response says
 * `configured: false` and the client silently falls back to localStorage, so
 * the app keeps working before the store is wired up.
 *
 *   GET  /api/user-store?email=…        → { configured, applied, saved }
 *   POST /api/user-store { email, applied?, saved? } → { configured, ok }
 *
 * NOTE: identity is the email from signup — there is no real auth yet, so this
 * is best-effort personalization, not a security boundary. Real auth is a
 * separate step; when it lands, the key becomes a verified user id.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export const maxDuration = 15

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const kvReady = Boolean(KV_URL && KV_TOKEN)

/** Run one Redis command via the Upstash REST API; returns the raw result. */
async function kvCommand(command: unknown[]): Promise<unknown> {
  const res = await fetch(KV_URL as string, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`KV ${res.status}`)
  const json = (await res.json()) as { result?: unknown; error?: string }
  if (json.error) throw new Error(json.error)
  return json.result
}

async function kvGetJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await kvCommand(['GET', key])
  if (typeof raw !== 'string' || raw.length === 0) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function kvSetJson(key: string, value: unknown): Promise<void> {
  await kvCommand(['SET', key, JSON.stringify(value)])
}

/** Namespaced key for a user's blob. Email is lowercased for stability. */
function keyFor(kind: 'applied' | 'saved', email: string): string {
  return `tucasa:${kind}:${email.trim().toLowerCase()}`
}

function cleanEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Store not connected yet → tell the client so it uses localStorage.
    if (!kvReady) {
      res.status(200).json({ configured: false })
      return
    }

    if (req.method === 'GET') {
      const email = cleanEmail(req.query.email)
      if (!email) {
        res.status(400).json({ error: 'Missing email.' })
        return
      }
      const [applied, saved] = await Promise.all([
        kvGetJson<string[]>(keyFor('applied', email), []),
        kvGetJson<unknown[]>(keyFor('saved', email), []),
      ])
      res.status(200).json({ configured: true, applied, saved })
      return
    }

    if (req.method === 'POST') {
      const body = (req.body ?? {}) as {
        email?: unknown
        applied?: unknown
        saved?: unknown
      }
      const email = cleanEmail(body.email)
      if (!email) {
        res.status(400).json({ error: 'Missing email.' })
        return
      }
      const writes: Promise<void>[] = []
      if (Array.isArray(body.applied)) {
        writes.push(kvSetJson(keyFor('applied', email), body.applied))
      }
      if (Array.isArray(body.saved)) {
        writes.push(kvSetJson(keyFor('saved', email), body.saved))
      }
      await Promise.all(writes)
      res.status(200).json({ configured: true, ok: true })
      return
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('user-store failed:', err)
    const message = err instanceof Error ? err.message : 'Storage is temporarily unavailable.'
    res.status(500).json({ error: message })
  }
}
