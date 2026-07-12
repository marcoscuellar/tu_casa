import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import type { RankedJob } from '../../engines/types'
import './flow.css'
import './Discovery.css'

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

export function Discovery() {
  const navigate = useNavigate()
  const { candidateName, candidateRole, jobs, matchCount, loading, selectJob } =
    useAppFlow()

  const checkFit = (job: RankedJob) => {
    selectJob(job.id)
    navigate('/fit')
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
              Built for <span className="red">you.</span>
            </h1>
            <p className="disc-sub">
              {candidateName} · {candidateRole}. Live openings, strongest fit
              first — every score earned against the role&rsquo;s real
              requirements. Finding &amp; ranking is always free.
            </p>
          </div>
          <div className="disc-count-wrap">
            <div className="disc-count">{matchCount}</div>
            <div className="disc-count-label mono-label">Genuine matches</div>
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
          {jobs.map((job, i) => {
            const top = i === 0
            const flagged = job.audit.recheck === 'flagged'
            // Tags = the required skills this résumé actually matched (why it ranks).
            const tags = job.fit.hardRequiredMatched.slice(0, 3).map(prettySkill)
            return (
              <div
                key={job.id}
                className={`disc-card ${top ? 'disc-card-top' : 'disc-card-plain'}`}
              >
                <div className="disc-card-inner">
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
                      {flagged && (
                        <span
                          className={`disc-flag ${top ? 'disc-flag-dark' : ''}`}
                          title={job.audit.note}
                        >
                          ⚑ Verify this one
                        </span>
                      )}
                    </div>
                    <div
                      className={`disc-meta mono-label ${
                        top ? 'muted-dark' : 'muted-light'
                      }`}
                    >
                      {[job.company, job.location, job.salary]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    {flagged && job.audit.note && (
                      <div className="disc-flag-note">{job.audit.note}</div>
                    )}
                    {job.locationNote && (
                      <div className="disc-flag-note">{job.locationNote}</div>
                    )}
                    <div className="disc-tags">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={`disc-tag ${top ? 'disc-tag-dark' : 'disc-tag-light'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className={`disc-btn ${top ? 'disc-btn-top' : 'disc-btn-plain'}`}
                    onClick={() => checkFit(job)}
                  >
                    Check my fit →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
