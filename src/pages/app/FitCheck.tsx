import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './flow.css'
import './FitCheck.css'

/**
 * Fit result — driven by the rubric's real scoring of the résumé against the
 * *discovered* posting. The candidate is never asked to paste a JD on the main
 * flow; that capability is parked behind providers.jd for a future optional
 * "check a specific job" feature.
 */
export function FitCheck() {
  const navigate = useNavigate()
  const { selectedJob, narrate, needsCredits, consumeSheet, hasAccount } = useAppFlow()

  // Reached without a selection (e.g. a refresh) → back to the shortlist.
  useEffect(() => {
    if (!selectedJob) navigate('/discovery', { replace: true })
  }, [selectedJob, navigate])
  if (!selectedJob) return null

  const { fit, company, role } = selectedJob
  const body = narrate(selectedJob)

  const prepMe = () => {
    // The cheat sheet is where we ask for an account — everything up to here
    // (upload, discovery, fit) is free and anonymous.
    if (!hasAccount) {
      navigate('/signup', { state: { next: '/cheat-generating' } })
      return
    }
    if (needsCredits()) {
      navigate('/paywall')
      return
    }
    consumeSheet()
    navigate('/cheat-generating')
  }

  return (
    <AppShell>
      <div className="pop">
        {/* Verdict */}
        <div className="blk blk-black fit-verdict">
          <div className="fit-verdict-left">
            <div className="eyebrow fit-verdict-eyebrow">
              Your fit · {role} · {company}
            </div>
            <h1 className="head fit-verdict-head">{fit.verdictHead}</h1>
            <p className="fit-verdict-body">{body}</p>
          </div>
          <div className="fit-verdict-score-wrap">
            <div className="fit-verdict-score">{fit.score}</div>
            <div className="fit-verdict-score-label mono-label">Fit score</div>
          </div>
        </div>

        {/* Columns */}
        <div className="fit-cols grid-collapse">
          <div className="blk-white fit-col">
            <div className="fit-col-label mono-label fit-col-label-ink">
              ✓ You&rsquo;ve got this covered
            </div>
            <div className="fit-items">
              {fit.covered.length > 0 ? (
                fit.covered.map((c) => (
                  <div key={c.t} className="fit-item">
                    <span className="fit-mark fit-mark-black">✓</span>
                    <div>
                      <div className="fit-item-title">{c.t}</div>
                      <div className="fit-item-desc">{c.d}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="fit-item-desc">
                  Nothing stood out as a clear strength here.
                </div>
              )}
            </div>
          </div>
          <div className="blk-white fit-col fit-col-gap">
            <div className="fit-col-label mono-label fit-col-label-red">
              ! Worth addressing first
            </div>
            <div className="fit-items">
              {fit.gaps.length > 0 ? (
                fit.gaps.map((g) => (
                  <div key={g.t} className="fit-item">
                    <span className="fit-mark fit-mark-red">!</span>
                    <div>
                      <div className="fit-item-title">{g.t}</div>
                      <div className="fit-item-desc">{g.d}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="fit-item-desc">
                  Nothing blocking — you&rsquo;re clear on the requirements.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="fit-actions">
          <button
            className="btn btn-red-to-black fit-action-primary"
            style={{ background: 'var(--red)', color: '#fff', borderRadius: 14, padding: 20 }}
            onClick={prepMe}
          >
            Got the interview? Prep me →
          </button>
          <button
            className="btn btn-outline fit-action-secondary"
            style={{ borderRadius: 14, padding: '20px 26px' }}
            onClick={() => navigate('/discovery')}
          >
            Back to shortlist
          </button>
        </div>
      </div>
    </AppShell>
  )
}
