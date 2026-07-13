import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import type { RankedJob } from '../../engines/types'
import './flow.css'
import './Discovery.css'

// Show the strongest handful first; reveal more on demand (7 at a time) up to a
// hard cap so a big shortlist stays focused. The cap is a display limit today;
// it becomes a real per-user quota once accounts + the credits model land.
const INITIAL_SHOWN = 7
const SHOW_MORE_STEP = 7
const MAX_SHOWN = 30

// Applied-job tracking, persisted client-side so it survives a refresh. Becomes
// account-backed once we have real users + a database.
const APPLIED_KEY = 'tucasa:applied'
function loadApplied(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(APPLIED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** Prettify a canonical skill id for a tag chip. */
function prettySkill(canonical: string): string {
  const SPECIAL: Record<string, string> = {
    react: 'React',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    'shopify-hydrogen': 'Shopify Hydrogen',
    'design-systems': 'Design systems',
    nextjs: 'Next.js',
    node: 'Node.js',
    graphql: 'GraphQL',
    k8s: 'Kubernetes',
  }
  return (
    SPECIAL[canonical] ??
    canonical.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ')
  )
}

/** A short, clean preview of the posting text. */
function snippet(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

export function Discovery() {
  const navigate = useNavigate()
  const { candidateName, candidateRole, jobs, loading, selectJob, hasAccount } = useAppFlow()
  const [visible, setVisible] = useState(INITIAL_SHOWN)
  const [openId, setOpenId] = useState<string | null>(null)
  const [applied, setApplied] = useState<Set<string>>(loadApplied)

  const toggleApplied = (id: string) => {
    // Tracking applications is an account feature — send them to sign in first.
    if (!hasAccount) {
      navigate('/signup', { state: { next: '/discovery' } })
      return
    }
    setApplied((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(APPLIED_KEY, JSON.stringify([...next]))
      } catch {
        /* ignore storage failures — tracking is best-effort */
      }
      return next
    })
  }

  const fullFit = (job: RankedJob) => {
    selectJob(job.id)
    navigate('/fit')
  }

  const cap = Math.min(jobs.length, MAX_SHOWN)
  const shown = jobs.slice(0, Math.min(visible, cap))
  const remaining = cap - shown.length
  const cappedOut = shown.length >= MAX_SHOWN && jobs.length > MAX_SHOWN

  return (
    <AppShell>
      <div className="pop">
        {/* Header */}
        <div className="blk blk-black disc-header">
          <div className="disc-header-left">
            <div className="eyebrow disc-eyebrow">
              Step 02 / Out · Ranked shortlist
            </div>
            <h1 className="head disc-head">
              Built for <span className="red">you.</span>
            </h1>
            <p className="disc-sub">
              {candidateName} · {candidateRole}. Live openings, strongest fit
              first — every score earned against the role&rsquo;s real
              requirements. Tap any role to see why it fits.
            </p>
          </div>
        </div>

        {/* Match list */}
        {loading && jobs.length === 0 && (
          <div className="disc-state">Finding real openings for you…</div>
        )}
        {!loading && jobs.length === 0 && (
          <div className="disc-state">
            No live openings matched your résumé yet. Try again shortly — boards
            update through the day.
          </div>
        )}
        <div className="disc-list">
          {shown.map((job, i) => {
            const top = i === 0
            const isOpen = openId === job.id
            const isApplied = applied.has(job.id)
            const flagged = job.audit.recheck === 'flagged'
            const matched = (
              job.fit.hardRequiredMatched.length
                ? job.fit.hardRequiredMatched.map(prettySkill)
                : job.fit.covered.map((c) => c.t)
            ).slice(0, 8)
            const meta = [job.company, job.location, job.salary].filter(Boolean).join(' · ')

            return (
              <div
                key={job.id}
                className={`disc-card ${top ? 'disc-card-top' : 'disc-card-plain'} ${
                  isOpen ? 'is-open' : ''
                } ${isApplied ? 'is-applied' : ''}`}
              >
                <button
                  className="disc-card-head"
                  onClick={() => setOpenId(isOpen ? null : job.id)}
                  aria-expanded={isOpen}
                >
                  <div className="disc-score-wrap">
                    <div className="disc-score">{job.fit.score}</div>
                    <div
                      className={`disc-score-label mono-label ${
                        top ? 'muted-dark' : 'muted-light'
                      }`}
                    >
                      Fit score
                    </div>
                  </div>
                  <div className="disc-mid">
                    <div className="disc-title-row">
                      <div className="disc-title">{job.role}</div>
                      {isApplied && <span className="disc-applied-badge">✓ Applied</span>}
                      {flagged && (
                        <span className={`disc-flag ${top ? 'disc-flag-dark' : ''}`} title={job.audit.note}>
                          ⚑ Verify
                        </span>
                      )}
                    </div>
                    <div className={`disc-meta mono-label ${top ? 'muted-dark' : 'muted-light'}`}>
                      {meta}
                    </div>
                  </div>
                  <span className="disc-chevron" aria-hidden>
                    {isOpen ? '–' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div className="disc-card-body">
                    {job.locationNote && (
                      <div className="disc-body-note">{job.locationNote}</div>
                    )}
                    {job.description && (
                      <p className="disc-desc">{snippet(job.description)}</p>
                    )}
                    {matched.length > 0 && (
                      <div className="disc-match">
                        <div className="disc-body-label mono-label">
                          Matching skills · why it fits you
                        </div>
                        <div className="disc-match-chips">
                          {matched.map((s) => (
                            <span key={s} className="disc-match-chip">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="disc-card-actions">
                      <a
                        className="disc-apply-btn"
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View &amp; apply →
                      </a>
                      <button className="disc-fit-btn" onClick={() => fullFit(job)}>
                        Full fit &amp; interview prep
                      </button>
                      <button
                        className={`disc-applied-btn ${isApplied ? 'is-on' : ''}`}
                        onClick={() => toggleApplied(job.id)}
                      >
                        {isApplied ? '✓ Applied — undo' : 'Mark as applied'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {remaining > 0 && (
          <div className="disc-more-row disc-more-center">
            <button
              className="disc-more-btn"
              onClick={() => setVisible((v) => Math.min(v + SHOW_MORE_STEP, cap))}
            >
              Show me the next {SHOW_MORE_STEP} →
            </button>
          </div>
        )}
        {cappedOut && (
          <div className="disc-more-row disc-more-center">
            <span className="disc-more-count mono-label">
              That&rsquo;s your top {MAX_SHOWN} — refine your résumé to sharpen the list.
            </span>
          </div>
        )}
      </div>
    </AppShell>
  )
}
