import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import './AdhdPanel.css'

/**
 * "One thing for your head" — a calm, low-pressure focus aid.
 * A rotating technique, a working countdown timer, a brain-dump offload,
 * and a mood check. On-brand supportive feature; keep the tone gentle.
 *
 * Self-contained and portable: it ships its own styles and theme fallbacks,
 * so it works dropped into any React app. Override the look by defining
 * --adhd-accent / --adhd-ink / --adhd-font / --adhd-mono (or the host's
 * --red / --bento / --font / --mono) on any ancestor. Everything is
 * configurable via props, with sensible defaults baked in.
 */

export interface Technique {
  type: 'timed' | 'physical' | 'write'
  title: string
  body: string
  /** Countdown length in seconds — required for `type: 'timed'`. */
  seconds?: number
}

export interface OffloadItem {
  id: number
  text: string
}

/** [id, label] pairs for the mood chips. */
export type MoodMode = [string, string]

export interface AdhdPanelProps {
  /** Called when the user dismisses the panel (backdrop, close button). */
  onClose: () => void
  /** The rotating focus techniques. Defaults to the built-in set. */
  techniques?: Technique[]
  /** Mood chips shown under "How's your head right now?". */
  moods?: MoodMode[]
  /** Mood selected on open. Defaults to `'clear'`. */
  initialMode?: string
  /** Seed items for the brain-dump list. Defaults to a single example. */
  initialOffload?: OffloadItem[]
  /** Header label. Defaults to "One thing for your head". */
  title?: string
  /** Notified whenever the selected mood changes. */
  onMoodChange?: (mode: string) => void
  /** Notified whenever the brain-dump list changes. */
  onOffloadChange?: (items: OffloadItem[]) => void
}

const DEFAULT_TECHNIQUES: Technique[] = [
  {
    type: 'timed',
    title: '2-minute rule',
    body: 'If the next move takes under two minutes, do it now instead of queuing it.',
    seconds: 120,
  },
  {
    type: 'timed',
    title: 'Timebox it',
    body: 'Set the timer for one narrow task. Stop when it rings, even mid-sentence.',
    seconds: 1500,
  },
  {
    type: 'physical',
    title: 'Body doubling',
    body: 'Work alongside someone else — even silently on a call — to borrow their focus.',
  },
  {
    type: 'physical',
    title: 'Take a movement break',
    body: 'Stand up, walk to another room, shake it out. Ninety seconds resets more than it costs.',
  },
  {
    type: 'write',
    title: 'Write one thing.',
    body: "Any sentence, however bad. That's the whole ask.",
  },
]

const DEFAULT_MOODS: MoodMode[] = [
  ['fog', 'Fog'],
  ['scattered', 'Scattered'],
  ['clear', 'Clear'],
  ['lockedin', 'Locked In'],
  ['avoiding', 'Avoiding'],
]

const DEFAULT_OFFLOAD: OffloadItem[] = [
  { id: 1, text: 'Follow up on the Notion role before Friday.' },
]

export function AdhdPanel({
  onClose,
  techniques = DEFAULT_TECHNIQUES,
  moods = DEFAULT_MOODS,
  initialMode = 'clear',
  initialOffload = DEFAULT_OFFLOAD,
  title = 'One thing for your head',
  onMoodChange,
  onOffloadChange,
}: AdhdPanelProps) {
  const [techIndex, setTechIndex] = useState(0)
  const [sillyOpen, setSillyOpen] = useState(false)
  const [mode, setMode] = useState(initialMode)
  const [offload, setOffload] = useState<OffloadItem[]>(initialOffload)
  const nextId = useRef(
    initialOffload.reduce((max, o) => Math.max(max, o.id), 0) + 1,
  )

  const tech = techniques[techIndex % techniques.length]
  const baseSeconds = tech.seconds ?? 0
  const [timerSeconds, setTimerSeconds] = useState(baseSeconds)
  const [remaining, setRemaining] = useState(baseSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }
  useEffect(() => clearTimer, [])

  const cycleTechnique = () => {
    clearTimer()
    setRunning(false)
    setSillyOpen(false)
    setTechIndex((i) => {
      const next = (i + 1) % techniques.length
      const secs = techniques[next].seconds ?? 0
      setTimerSeconds(secs)
      setRemaining(secs)
      return next
    })
  }

  const toggleTimer = () => {
    if (running) {
      clearTimer()
      setRunning(false)
      return
    }
    if (remaining <= 0) return
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTimer()
          setRunning(false)
          return 0
        }
        return r - 1
      })
    }, 1000)
  }

  const resetTimer = () => {
    clearTimer()
    setRunning(false)
    setRemaining(timerSeconds)
  }

  const commitOffload = (next: OffloadItem[]) => {
    setOffload(next)
    onOffloadChange?.(next)
  }

  const addOffload = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const target = e.currentTarget
    const text = target.value.trim()
    if (!text) return
    commitOffload([...offload, { id: nextId.current++, text }])
    target.value = ''
  }

  const removeOffload = (id: number) =>
    commitOffload(offload.filter((o) => o.id !== id))

  const selectMode = (id: string) => {
    setMode(id)
    onMoodChange?.(id)
  }

  const durationLabel = baseSeconds
    ? baseSeconds >= 60
      ? `${Math.round(baseSeconds / 60)} min`
      : `${baseSeconds}s`
    : null

  const mm = Math.floor(remaining / 60)
  const ss = remaining % 60
  const timerDisplay = `${mm}:${String(ss).padStart(2, '0')}`
  const timerBtnLabel = running ? 'Pause' : remaining === 0 ? 'Done' : 'Start'
  const sweep = Math.round((1 - remaining / (timerSeconds || 1)) * 360)

  return (
    <div className="adhd-backdrop" onClick={onClose}>
      <div
        className="adhd-modal"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="adhd-head">
          <span className="adhd-head-label">{title}</span>
          <button className="adhd-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="adhd-body">
          <div className="adhd-tech-title">{tech.title}</div>
          <div className="adhd-tech-body">{tech.body}</div>

          {durationLabel && (
            <div className="adhd-timer">
              <div
                className="adhd-ring"
                style={{
                  background: `conic-gradient(var(--adhd-accent) ${sweep}deg, rgba(236,232,222,.14) 0deg)`,
                }}
              >
                <div className="adhd-ring-inner">{timerDisplay}</div>
              </div>
              <div className="adhd-timer-actions">
                <button className="adhd-btn adhd-btn-red" onClick={toggleTimer}>
                  {timerBtnLabel} {durationLabel}
                </button>
                <button className="adhd-btn adhd-btn-ghost" onClick={resetTimer}>
                  Reset
                </button>
              </div>
            </div>
          )}

          {tech.type === 'write' && (
            <div style={{ marginTop: 14 }}>
              <button
                className="adhd-btn adhd-btn-dark"
                onClick={() => setSillyOpen((v) => !v)}
              >
                I wrote it →
              </button>
            </div>
          )}

          {tech.type === 'write' && sillyOpen && (
            <div className="adhd-silly">
              Good. Now rewrite it as ridiculous as you can — the freeze breaks
              faster than the fix does.
            </div>
          )}

          <div className="adhd-try-row">
            <button className="adhd-try" onClick={cycleTechnique}>
              Try another →
            </button>
          </div>

          <div className="adhd-offload-input-row">
            <span className="adhd-offload-plus">+</span>
            <input
              className="adhd-offload-input"
              onKeyDown={addOffload}
              placeholder="One thought, then let go."
            />
          </div>

          {offload.length > 0 && (
            <div className="adhd-offload-list">
              {offload.map((o) => (
                <div key={o.id} className="adhd-offload-item">
                  <span className="adhd-offload-dash">—</span>
                  <span className="adhd-offload-text">{o.text}</span>
                  <button
                    className="adhd-offload-remove"
                    onClick={() => removeOffload(o.id)}
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="adhd-mood">
            <div className="adhd-mood-label">How's your head right now?</div>
            <div className="adhd-mood-chips">
              {moods.map(([id, label]) => (
                <button
                  key={id}
                  className={`adhd-chip ${mode === id ? 'is-selected' : ''}`}
                  onClick={() => selectMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
