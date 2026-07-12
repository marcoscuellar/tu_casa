import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import './AdhdPanel.css'

/**
 * "One thing for your head" — a calm, low-pressure focus aid.
 * A rotating technique, a working countdown timer, a brain-dump offload,
 * and a mood check. On-brand supportive feature; keep the tone gentle.
 */

interface Technique {
  type: 'timed' | 'physical' | 'write'
  title: string
  body: string
  seconds?: number
}

const TECHNIQUES: Technique[] = [
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

const MODES: [string, string][] = [
  ['fog', 'Fog'],
  ['scattered', 'Scattered'],
  ['clear', 'Clear'],
  ['lockedin', 'Locked In'],
  ['avoiding', 'Avoiding'],
]

interface OffloadItem {
  id: number
  text: string
}

export function AdhdPanel({ onClose }: { onClose: () => void }) {
  const [techIndex, setTechIndex] = useState(0)
  const [sillyOpen, setSillyOpen] = useState(false)
  const [mode, setMode] = useState('clear')
  const [offload, setOffload] = useState<OffloadItem[]>([
    { id: 1, text: 'Follow up on the Notion role before Friday.' },
  ])
  const nextId = useRef(2)

  const tech = TECHNIQUES[techIndex % TECHNIQUES.length]
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
      const next = (i + 1) % TECHNIQUES.length
      const secs = TECHNIQUES[next].seconds ?? 0
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

  const addOffload = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const target = e.currentTarget
    const text = target.value.trim()
    if (!text) return
    setOffload((list) => [...list, { id: nextId.current++, text }])
    target.value = ''
  }

  const removeOffload = (id: number) =>
    setOffload((list) => list.filter((o) => o.id !== id))

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
        aria-label="One thing for your head"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="adhd-head">
          <span className="adhd-head-label">One thing for your head</span>
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
                  background: `conic-gradient(#ff0000 ${sweep}deg, rgba(236,232,222,.14) 0deg)`,
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
            <span
              style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#ff0000' }}
            >
              +
            </span>
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
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      color: 'rgba(0,0,0,.4)',
                      marginTop: 2,
                    }}
                  >
                    —
                  </span>
                  <span style={{ flex: 1 }}>{o.text}</span>
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
              {MODES.map(([id, label]) => {
                const sel = mode === id
                return (
                  <button
                    key={id}
                    className="adhd-chip"
                    onClick={() => setMode(id)}
                    style={{
                      border: `1px solid ${sel ? '#0a0a0a' : 'rgba(0,0,0,.2)'}`,
                      background: sel ? '#0a0a0a' : 'transparent',
                      color: sel ? '#fff' : 'rgba(0,0,0,.7)',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
