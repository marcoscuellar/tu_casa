import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import { MATCHES, type Match } from '../../flow/data'
import './flow.css'
import './Discovery.css'

export function Discovery() {
  const navigate = useNavigate()
  const { candidate, setFitTarget } = useAppFlow()

  const checkFit = (m: Match) => {
    setFitTarget(`${m.title} · ${m.company}`, m.company, m.title)
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
              {candidate.name} · {candidate.role}. Live openings, strongest fit
              first — every score earned against the role&rsquo;s real
              requirements. Finding &amp; ranking is always free.
            </p>
          </div>
          <div className="disc-count-wrap">
            <div className="disc-count">{MATCHES.length}</div>
            <div className="disc-count-label mono-label">Genuine matches</div>
          </div>
        </div>

        {/* Match list */}
        <div className="disc-list">
          {MATCHES.map((m) => {
            const top = !!m.top
            return (
              <div
                key={m.title + m.company}
                className={`disc-card ${top ? 'disc-card-top' : 'disc-card-plain'}`}
              >
                <div className="disc-card-inner">
                  <div className="disc-score-wrap">
                    <div className="disc-score">{m.score}</div>
                    <div
                      className={`disc-score-label mono-label ${
                        top ? 'muted-dark' : 'muted-light'
                      }`}
                    >
                      Fit score
                    </div>
                  </div>
                  <div className="disc-mid">
                    <div className="disc-title">{m.title}</div>
                    <div
                      className={`disc-meta mono-label ${
                        top ? 'muted-dark' : 'muted-light'
                      }`}
                    >
                      {m.company} · {m.location} · {m.salary}
                    </div>
                    <div className="disc-tags">
                      {m.tags.map((tag) => (
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
                    onClick={() => checkFit(m)}
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
