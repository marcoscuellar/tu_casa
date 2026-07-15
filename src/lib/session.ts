/**
 * Unsaved-shortlist persistence. The ranked list lives in the flow context
 * (produced by the pipeline); this snapshots it to localStorage so closing the
 * tab before an explicit "Save my shortlist" doesn't lose it — reopening
 * /discovery rehydrates the same list without re-running the search.
 *
 * This is the WORKING session (may be anonymous). The explicit save
 * (tucasa:savedList / user-store) is separate and account-scoped.
 */

import type { PipelineResult } from '../engines/pipeline'
import type { InterviewInput } from '../engines/types'

const KEY = 'tucasa:session'
const VERSION = 1
// Bound the persisted broader tail so a huge live pull can't blow localStorage.
const MAX_BROADER = 60

export interface SessionSnapshot {
  version: number
  name: string
  email: string
  selectedId: string | null
  pipeline: PipelineResult
  /** Cheat-sheet intake, so it survives a signup round-trip / reload. */
  interview?: InterviewInput | null
}

export function saveSession(s: Omit<SessionSnapshot, 'version'>): void {
  try {
    const snapshot: SessionSnapshot = {
      version: VERSION,
      name: s.name,
      email: s.email,
      selectedId: s.selectedId,
      interview: s.interview ?? null,
      pipeline: {
        ...s.pipeline,
        broaderJobs: s.pipeline.broaderJobs.slice(0, MAX_BROADER),
      },
    }
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    /* quota or serialize failure — persistence is best-effort */
  }
}

export function loadSession(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as SessionSnapshot
    if (s.version !== VERSION || !s.pipeline || !Array.isArray(s.pipeline.jobs)) return null
    return s
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* best-effort */
  }
}
