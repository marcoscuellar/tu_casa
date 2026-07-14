/**
 * Client for /api/user-store — per-user persistence (Vercel KV).
 *
 * Every call is best-effort: if the store isn't connected yet, or the network
 * hiccups, these return null / false and the caller falls back to localStorage.
 * That keeps the app fully working before (and without) the KV store.
 */

/** A snapshot of a saved opening — enough to re-render it without re-searching. */
export interface SavedJob {
  id: string
  role: string
  company: string
  location: string
  score: number
  link: string
  salary?: string
}

export interface UserStore {
  applied: string[]
  saved: SavedJob[]
}

/** Load a user's persisted data, or null when the store isn't available. */
export async function loadUserStore(email: string): Promise<UserStore | null> {
  if (!email) return null
  try {
    const res = await fetch(`/api/user-store?email=${encodeURIComponent(email)}`)
    if (!res.ok) return null
    const data = (await res.json()) as {
      configured?: boolean
      applied?: string[]
      saved?: SavedJob[]
    }
    if (!data.configured) return null
    return { applied: data.applied ?? [], saved: data.saved ?? [] }
  } catch {
    return null
  }
}

/** Persist part of a user's data. Returns true only when the store took it. */
export async function saveUserStore(
  email: string,
  patch: { applied?: string[]; saved?: SavedJob[] },
): Promise<boolean> {
  if (!email) return false
  try {
    const res = await fetch('/api/user-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...patch }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { configured?: boolean; ok?: boolean }
    return Boolean(data.configured && data.ok)
  } catch {
    return false
  }
}
