import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './flow.css'
import './Dashboard.css'

/**
 * Dashboard (board turn 23) — the hunt at a glance. Driven by the jobs the
 * candidate marked applied (localStorage today, KV/accounts later). Each row's
 * status cycles Applied → Interviewing → Offer → Rejected and persists, so the
 * counts and table reflect real activity, not a mock.
 */
const STATUSES = ['applied', 'interviewing', 'offer', 'rejected'] as const
type Status = (typeof STATUSES)[number]
const STATUS_LABEL: Record<Status, string> = {
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

const APPLIED_KEY = 'tucasa:applied'
const STATUS_KEY = 'tucasa:status'
const SAVED_KEY = 'tucasa:savedList'

function loadApplied(): string[] {
  try {
    return JSON.parse(localStorage.getItem(APPLIED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}
function loadStatus(): Record<string, Status> {
  try {
    return JSON.parse(localStorage.getItem(STATUS_KEY) ?? '{}') as Record<string, Status>
  } catch {
    return {}
  }
}
function savedCount(): number {
  try {
    return (JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as unknown[]).length
  } catch {
    return 0
  }
}

export function Dashboard() {
  const navigate = useNavigate()
  const { jobs } = useAppFlow()
  const [statusMap, setStatusMap] = useState<Record<string, Status>>(loadStatus)

  const appliedIds = loadApplied()
  const appliedJobs = jobs.filter((j) => appliedIds.includes(j.id))
  const statusOf = (id: string): Status => statusMap[id] ?? 'applied'
  const cycle = (id: string) =>
    setStatusMap((prev) => {
      const cur = prev[id] ?? 'applied'
      const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length]
      const m = { ...prev, [id]: next }
      try {
        localStorage.setItem(STATUS_KEY, JSON.stringify(m))
      } catch {
        /* best-effort */
      }
      return m
    })
  const count = (s: Status) => appliedJobs.filter((j) => statusOf(j.id) === s).length

  const cards = [
    { label: 'Applied', value: appliedJobs.length, cls: 'is-dark' },
    { label: 'Interviewing', value: count('interviewing'), cls: 'is-teal' },
    { label: 'Saved', value: savedCount(), cls: '' },
    { label: 'Offer', value: count('offer'), cls: '' },
  ]

  return (
    <AppShell>
      <div className="dash pop">
        <h1 className="dash-head">
          Your hunt <span className="dash-accent">so far.</span>
        </h1>

        <div className="dash-cards">
          {cards.map((c) => (
            <div key={c.label} className={`dash-card ${c.cls}`}>
              <div className="dash-card-num">{c.value}</div>
              <div className="dash-card-label mono-label">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="dash-table">
          <div className="dash-row dash-row-head">
            <span>Role</span>
            <span>Company</span>
            <span>Applied</span>
            <span>Status</span>
          </div>
          {appliedJobs.length === 0 ? (
            <div className="dash-empty">
              No applications yet. Apply to roles from{' '}
              <button className="dash-link" onClick={() => navigate('/discovery')}>
                Discovery
              </button>{' '}
              and mark them applied — they&rsquo;ll track here.
            </div>
          ) : (
            appliedJobs.map((j) => {
              const s = statusOf(j.id)
              return (
                <div key={j.id} className="dash-row">
                  <span className="dash-role">{j.role}</span>
                  <span className="dash-company">{j.company}</span>
                  <span className="dash-date mono-label">—</span>
                  <span>
                    <button
                      className={`dash-status is-${s}`}
                      onClick={() => cycle(j.id)}
                      title="Click to update status"
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </AppShell>
  )
}
