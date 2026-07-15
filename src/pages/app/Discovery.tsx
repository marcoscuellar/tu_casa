import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import { loadUserStore, saveUserStore, type SavedJob } from '../../lib/userStore'
import type { ParsedResume, RankedJob } from '../../engines/types'
import './flow.css'
import './Discovery.css'

// Reveal the shortlist a page at a time so even the focused top-50 lands calmly
// and scannable. Start with 10, then "show next 10". The focus cap itself lives
// in the pipeline; here we only paginate.
const INITIAL_SHOWN = 10
const SHOW_MORE_STEP = 10

// Fit-score tier boundary: at/above this reads as an "Excellent fit", below as
// a "Strong fit". Everything shown is already among the best matches.
const EXCELLENT_FIT = 85

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

// Saved shortlist — the ranked list the candidate chose to keep. Client-side
// for now; account-backed once we have real users + a database.
const SAVED_KEY = 'tucasa:savedList'

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
function snippet(text: string, max = 360): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

/** Remote / Hybrid / Onsite, read from the posting. */
function workType(job: RankedJob): string {
  if (/\bhybrid\b/i.test(job.location)) return 'Hybrid'
  if (job.remote) return 'Remote'
  return 'Onsite'
}

/**
 * Postings often list many cities joined by ";" (Denver, CO;Atlanta, GA;…).
 * Show the first and collapse the rest so the meta line stays readable.
 */
function prettyLocation(loc: string): string {
  const parts = loc
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length <= 1) return loc.trim()
  return `${parts[0]} +${parts.length - 1} more`
}

/**
 * The candidate's own skills that this posting actually names — cross-referenced
 * against the description, so "why it fits you" is concrete, not generic.
 */
function skillsInPosting(resume: ParsedResume | undefined, job: RankedJob): string[] {
  const desc = (job.description ?? '').toLowerCase()
  const hits: string[] = []
  if (resume && desc) {
    for (const s of resume.skills) {
      const words = s.canonical.replace(/-/g, ' ')
      if (desc.includes(s.canonical) || desc.includes(words)) hits.push(prettySkill(s.canonical))
    }
  }
  // Fall back to the rubric's matched hard requirements if the text match is thin.
  if (hits.length === 0) return job.fit.hardRequiredMatched.map(prettySkill).slice(0, 8)
  return hits.slice(0, 10)
}

export function Discovery() {
  const navigate = useNavigate()
  const { candidateName, candidateRole, jobs, broaderJobs, rawCount, loading, selectJob, hasAccount, email, resume } =
    useAppFlow()
  const [visible, setVisible] = useState(INITIAL_SHOWN)
  const [showBroader, setShowBroader] = useState(false)
  const [broaderVisible, setBroaderVisible] = useState(INITIAL_SHOWN)
  const [openId, setOpenId] = useState<string | null>(null)
  const [applied, setApplied] = useState<Set<string>>(loadApplied)
  const [listSaved, setListSaved] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SAVED_KEY) !== null
    } catch {
      return false
    }
  })
  const [saveEmail, setSaveEmail] = useState(email)

  // Hydrate from the KV store when signed in. If the store isn't connected yet
  // (or the fetch fails) this no-ops and the localStorage-seeded state stands.
  useEffect(() => {
    if (!email) return
    let alive = true
    void loadUserStore(email).then((store) => {
      if (!alive || !store) return
      setApplied(new Set(store.applied))
      setListSaved(store.saved.length > 0)
    })
    return () => {
      alive = false
    }
  }, [email])

  // Persist locally (instant, offline) AND to the store (cross-device).
  const persistApplied = (ids: string[]) => {
    try {
      localStorage.setItem(APPLIED_KEY, JSON.stringify(ids))
    } catch {
      /* ignore storage failures — tracking is best-effort */
    }
    void saveUserStore(email, { applied: ids })
  }

  // Save-my-shortlist bar (board turn 13): email capture, no signup wall. Snapshots
  // the ranked list keyed by the entered email so it survives reload and can be
  // emailed/kept updated later.
  const snapshotJobs = (): SavedJob[] =>
    jobs.map((j) => ({
      id: j.id,
      role: j.role,
      company: j.company,
      location: j.location,
      score: j.fit.score,
      link: j.link,
      salary: j.salary,
    }))

  const saveShortlist = () => {
    const addr = saveEmail.trim()
    if (!/.+@.+\..+/.test(addr)) return
    const snapshots = snapshotJobs()
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(snapshots.map((s) => s.id)))
    } catch {
      /* best-effort */
    }
    void saveUserStore(addr, { saved: snapshots })
    setListSaved(true)
  }

  const toggleApplied = (id: string) => {
    // Tracking applications is an account feature — send them to sign in first.
    if (!hasAccount) {
      navigate('/signup', { state: { next: '/discovery' } })
      return
    }
    const next = new Set(applied)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setApplied(next)
    persistApplied([...next])
  }

  const fullFit = (job: RankedJob) => {
    selectJob(job.id)
    navigate('/fit')
  }

  // The focused shortlist (already capped in the pipeline), paginated + tiered.
  const focusedShown = jobs.slice(0, Math.min(visible, jobs.length))
  const excellent = focusedShown.filter((j) => j.fit.score >= EXCELLENT_FIT)
  const strong = focusedShown.filter((j) => j.fit.score < EXCELLENT_FIT)
  const focusedRemaining = jobs.length - focusedShown.length
  const topId = jobs[0]?.id

  // One card renderer, reused across the Excellent / Strong / Broader groups.
  const renderCard = (job: RankedJob) => {
    const top = job.id === topId
    const isOpen = openId === job.id
    const isApplied = applied.has(job.id)
    const flagged = job.audit.recheck === 'flagged'
    const matched = skillsInPosting(resume, job)
    const metaParts = [
      job.company,
      prettyLocation(job.location),
      job.industryLabel,
    ].filter(Boolean) as string[]

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
            <div className="disc-score-label mono-label muted-light">Fit score</div>
          </div>
          <div className="disc-mid">
            <div className="disc-title-row">
              <div className="disc-title">{job.role}</div>
              {isApplied && <span className="disc-applied-badge">✓ Applied</span>}
              {flagged && (
                <span className="disc-flag" title={job.audit.note}>
                  ⚑ Verify
                </span>
              )}
            </div>
            <div className="disc-meta mono-label">{metaParts.join(' · ')}</div>
            {matched.length > 0 && (
              <div className="disc-head-chips">
                {matched.slice(0, 4).map((s) => (
                  <span key={s} className="disc-head-chip">
                    {s}
                  </span>
                ))}
              </div>
            )}
            {job.alsoPostedOn && job.alsoPostedOn.length > 0 && (
              <div className="disc-also mono-label">
                ↗ Also posted on {job.alsoPostedOn.length} other{' '}
                {job.alsoPostedOn.length === 1 ? 'site' : 'sites'}
              </div>
            )}
          </div>
          <span className="disc-chevron" aria-hidden>
            {isOpen ? '–' : '+'}
          </span>
        </button>

        {isOpen && (
          <div className="disc-card-body">
            {/* Facts — the hard specs, no opinion */}
            <div className="disc-facts">
              <div className="disc-fact">
                <div className="disc-fact-label mono-label">Fit score</div>
                <div className="disc-fact-val">{job.fit.score}/100</div>
              </div>
              {job.salary && (
                <div className="disc-fact">
                  <div className="disc-fact-label mono-label">Pay</div>
                  <div className="disc-fact-val">{job.salary}</div>
                </div>
              )}
              <div className="disc-fact">
                <div className="disc-fact-label mono-label">Work type</div>
                <div className="disc-fact-val">{workType(job)}</div>
              </div>
              {job.industryLabel && (
                <div className="disc-fact">
                  <div className="disc-fact-label mono-label">Industry</div>
                  <div className="disc-fact-val">
                    {job.industryLabel}
                    {job.industryMatch === 'same' && (
                      <span className="disc-field-tag is-same"> ✓ your field</span>
                    )}
                    {job.industryMatch === 'different' && (
                      <span className="disc-field-tag is-diff"> ✕ new field</span>
                    )}
                  </div>
                </div>
              )}
              <div className="disc-fact">
                <div className="disc-fact-label mono-label">Seniority</div>
                <div className="disc-fact-val">
                  {job.fit.seniorityBarMet ? 'You clear it' : 'A stretch'}
                </div>
              </div>
              <div className="disc-fact">
                <div className="disc-fact-label mono-label">Posted</div>
                <div className="disc-fact-val">{job.postedDate}</div>
              </div>
            </div>

            {job.locationNote && (
              <div className="disc-body-note">{job.locationNote}</div>
            )}
            {job.industryNote && (
              <div
                className={`disc-body-note disc-field-note ${
                  job.industryMatch === 'same' ? 'is-same' : 'is-diff'
                }`}
              >
                {job.industryNote}
              </div>
            )}

            {/* How you measure up — the real answer, straight from the rubric */}
            <div className="disc-section">
              <div className="disc-body-label mono-label">How you measure up</div>
              <div className="disc-measure">
                <div className="disc-measure-col">
                  <div className="disc-measure-head disc-measure-good">
                    ✓ What you bring
                  </div>
                  {job.fit.covered.length > 0 ? (
                    job.fit.covered.map((c) => (
                      <div key={c.t} className="disc-measure-item">
                        <div className="disc-measure-t">{c.t}</div>
                        <div className="disc-measure-d">{c.d}</div>
                      </div>
                    ))
                  ) : (
                    <div className="disc-measure-empty">
                      Matched on your title and seniority.
                    </div>
                  )}
                </div>
                <div className="disc-measure-col">
                  <div className="disc-measure-head disc-measure-gap">
                    △ Worth addressing
                  </div>
                  {job.fit.gaps.length > 0 ? (
                    job.fit.gaps.map((g) => (
                      <div key={g.t} className="disc-measure-item">
                        <div className="disc-measure-t">{g.t}</div>
                        <div className="disc-measure-d">{g.d}</div>
                      </div>
                    ))
                  ) : (
                    <div className="disc-measure-empty">
                      Nothing blocking — you&rsquo;re clear on the stated requirements.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {job.description && (
              <div className="disc-section">
                <div className="disc-body-label mono-label">What the role is</div>
                <p className="disc-desc">{snippet(job.description, 460)}</p>
              </div>
            )}

            {job.alsoPostedOn && job.alsoPostedOn.length > 0 && (
              <div className="disc-section">
                <div className="disc-body-label mono-label">
                  Also posted on — we kept the best version
                </div>
                <div className="disc-also-list">
                  {job.alsoPostedOn.map((d) => (
                    <a
                      key={d.id}
                      className="disc-also-link"
                      href={d.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {d.label} ↗
                    </a>
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
                Prep me for the interview →
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
  }

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
              Built for <span className="disc-you">you.</span>
            </h1>
            <p className="disc-sub">
              {candidateName} · {candidateRole}. Live openings, strongest fit
              first — every score earned against the role&rsquo;s real
              requirements. Tap any role to see why it fits.
            </p>
            {rawCount > jobs.length && (
              <div className="disc-reviewed mono-label">
                We reviewed {rawCount} live postings and ranked your best{' '}
                {jobs.length}.
              </div>
            )}
          </div>
          {jobs.length > 0 && (
            <div className="disc-header-count">
              <div className="disc-count-num">{jobs.length}</div>
              <div className="disc-count-label mono-label">Genuine matches</div>
            </div>
          )}
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
          {excellent.length > 0 && (
            <div className="disc-tier mono-label">Excellent fits · {excellent.length}</div>
          )}
          {excellent.map(renderCard)}
          {strong.length > 0 && (
            <div className="disc-tier mono-label">Strong fits · {strong.length}</div>
          )}
          {strong.map(renderCard)}
        </div>

        {focusedRemaining > 0 && (
          <div className="disc-more-row disc-more-center">
            <button
              className="disc-more-btn"
              onClick={() => setVisible((v) => Math.min(v + SHOW_MORE_STEP, jobs.length))}
            >
              Show me the next {Math.min(SHOW_MORE_STEP, focusedRemaining)} →
            </button>
          </div>
        )}

        {focusedRemaining === 0 && broaderJobs.length > 0 && !showBroader && (
          <div className="disc-more-row disc-more-center">
            <button
              className="disc-more-btn disc-broader-btn"
              onClick={() => setShowBroader(true)}
            >
              Show broader matches ({broaderJobs.length}) →
            </button>
          </div>
        )}

        {showBroader && broaderJobs.length > 0 && (
          <>
            <div className="disc-tier disc-tier-broad mono-label">
              Broader matches · {broaderJobs.length}
            </div>
            <div className="disc-list">
              {broaderJobs.slice(0, broaderVisible).map(renderCard)}
            </div>
            {broaderVisible < broaderJobs.length && (
              <div className="disc-more-row disc-more-center">
                <button
                  className="disc-more-btn"
                  onClick={() =>
                    setBroaderVisible((v) => Math.min(v + SHOW_MORE_STEP, broaderJobs.length))
                  }
                >
                  Show me the next{' '}
                  {Math.min(SHOW_MORE_STEP, broaderJobs.length - broaderVisible)} →
                </button>
              </div>
            )}
          </>
        )}

        {/* Save-my-shortlist bar (turn 13) */}
        {jobs.length > 0 && (
          <div className="disc-savebar">
            <div className="disc-savebar-left">
              <div className="disc-savebar-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 4h14a1 1 0 0 1 1 1v15l-8-4-8 4V5a1 1 0 0 1 1-1z" />
                </svg>
              </div>
              <div className="disc-savebar-copy">
                <div className="disc-savebar-title">
                  {listSaved ? 'Shortlist saved ✓' : 'Save my shortlist'}
                </div>
                <div className="disc-savebar-sub">
                  {jobs.length} matches, ranked. We&rsquo;ll email it and keep it
                  updated as new roles land.
                </div>
              </div>
            </div>
            {!listSaved && (
              <div className="disc-savebar-form">
                <input
                  className="disc-savebar-input"
                  type="email"
                  placeholder="you@email.com"
                  value={saveEmail}
                  onChange={(e) => setSaveEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveShortlist()}
                />
                <button className="disc-savebar-btn" onClick={saveShortlist}>
                  Save shortlist →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
