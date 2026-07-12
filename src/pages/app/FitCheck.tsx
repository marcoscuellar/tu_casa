import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import {
  COVERED,
  FIT_SCORE,
  FIT_VERDICT_BODY,
  FIT_VERDICT_HEAD,
  GAPS,
} from '../../flow/data'
import './flow.css'
import './FitCheck.css'

type Stage = 'input' | 'result'

export function FitCheck() {
  const { fitJobTitle, jd, setJd } = useAppFlow()
  const [stage, setStage] = useState<Stage>('input')
  const [err, setErr] = useState('')

  const runFit = () => {
    // In production the pasted JD is required and drives the real fit scoring.
    if (!jd.trim()) return setErr('Paste the job description to check your fit.')
    setErr('')
    setStage('result')
    window.scrollTo({ top: 0 })
  }

  return (
    <AppShell>
      <div className="pop">
        {stage === 'input' ? (
          <div className="fit-input-grid grid-collapse">
            <div className="blk blk-red fit-input-left">
              <div className="eyebrow fit-input-eyebrow">Fit check · free</div>
              <div>
                <h1 className="head fit-input-head">
                  Should you
                  <br />
                  even apply?
                </h1>
                <p className="fit-input-body">
                  Paste the job description. We grade your résumé against what
                  the role actually needs — what you&rsquo;ve got covered, and
                  where the gaps are. Honest scores, no inflation.
                </p>
              </div>
              <div className="fit-input-target mono-label">
                Checking against: {fitJobTitle}
              </div>
            </div>
            <div className="blk blk-white fit-input-right">
              <label className="fit-textarea-label mono-label" htmlFor="fit-jd">
                Paste the job description
              </label>
              <textarea
                id="fit-jd"
                className="fit-textarea"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full posting here — responsibilities, requirements, nice-to-haves…"
              />
              {err && <div className="fit-input-err">{err}</div>}
              <button className="btn btn-black fit-input-submit" onClick={runFit}>
                Check my fit
              </button>
            </div>
          </div>
        ) : (
          <ResultStage />
        )}
      </div>
    </AppShell>
  )
}

function ResultStage() {
  const navigate = useNavigate()
  const { fitJobTitle, needsCredits, consumeSheet } = useAppFlow()

  const prepMe = () => {
    // The first cheat sheet is free; after that, gate on credits (paywall).
    if (needsCredits()) {
      navigate('/paywall')
      return
    }
    consumeSheet()
    navigate('/cheat-generating')
  }

  return (
    <div>
      {/* Verdict */}
      <div className="blk blk-black fit-verdict">
        <div className="fit-verdict-left">
          <div className="eyebrow fit-verdict-eyebrow">Your fit · {fitJobTitle}</div>
          <h1 className="head fit-verdict-head">{FIT_VERDICT_HEAD}</h1>
          <p className="fit-verdict-body">{FIT_VERDICT_BODY}</p>
        </div>
        <div className="fit-verdict-score-wrap">
          <div className="fit-verdict-score">{FIT_SCORE}</div>
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
            {COVERED.map((c) => (
              <div key={c.t} className="fit-item">
                <span className="fit-mark fit-mark-black">✓</span>
                <div>
                  <div className="fit-item-title">{c.t}</div>
                  <div className="fit-item-desc">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="blk-white fit-col fit-col-gap">
          <div className="fit-col-label mono-label fit-col-label-red">
            ! Worth addressing first
          </div>
          <div className="fit-items">
            {GAPS.map((g) => (
              <div key={g.t} className="fit-item">
                <span className="fit-mark fit-mark-red">!</span>
                <div>
                  <div className="fit-item-title">{g.t}</div>
                  <div className="fit-item-desc">{g.d}</div>
                </div>
              </div>
            ))}
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
  )
}
