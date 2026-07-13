import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import type { ParsedResume, RankedJob } from '../../engines/types'
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
  const { candidateName, candidateRole, jobs, loading, selectJob, hasAccount, resume } =
    useAppFlow()
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
            const matched = skillsInPosting(resume, job)
            const meta = [job.company, job.location, job.industryLabel]
              .filter(Boolean)
              .join(' · ')

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
                          {matched.length > 0 && (
                            <div className="disc-match-chips disc-measure-chips">
                              {matched.map((s) => (
                                <span key={s} className="disc-match-chip">
                                  {s}
                                </span>
                              ))}
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
