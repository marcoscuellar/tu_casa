/**
 * Lightweight client-side event tracking — enough to watch save attempts and
 * signup conversion while we're pre-backend. Logs to the console and keeps a
 * bounded ring buffer in localStorage; swap the sink for a real analytics
 * endpoint once accounts land. Best-effort: never throws into the UI.
 */

export type TrackEvent =
  | 'save_shortlist_attempt'
  | 'account_gate_shown'
  | 'account_created'
  | 'account_gate_dismissed'
  | 'gated_nav_click'

const KEY = 'tucasa:events'
const MAX = 200

export function track(event: TrackEvent, props: Record<string, unknown> = {}): void {
  try {
    // eslint-disable-next-line no-console
    console.info('[track]', event, props)
    const log = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]
    log.push({ event, props, at: new Date().toISOString() })
    localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX)))
  } catch {
    /* best-effort — tracking must never break the flow */
  }
}
