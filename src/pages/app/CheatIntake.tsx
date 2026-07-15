import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './CheatIntake.css'

/**
 * Cheat-sheet intake — the cheat sheet is user-initiated and specific, never
 * pre-written. The user names WHO they're meeting, the company, and the role;
 * Engine 5 scopes the research to that person's department. Reached pre-filled
 * from Fit ("Prep me") or blank from the "Cheat sheets" nav.
 */
export function CheatIntake() {
  const navigate = useNavigate()
  const { selectedJob, setInterview, hasAccount, needsCredits, consumeSheet } = useAppFlow()
  const [interviewerName, setName] = useState('')
  const [interviewerTitle, setTitle] = useState('')
  const [company, setCompany] = useState(selectedJob?.company ?? '')
  const [role, setRole] = useState(selectedJob?.role ?? '')
  const [err, setErr] = useState('')

  const build = () => {
    if (!interviewerTitle.trim() && !role.trim()) {
      return setErr('Add who you’re meeting (or the role) so we can scope the research.')
    }
    if (!company.trim()) return setErr('Which company is this interview with?')
    setErr('')
    setInterview({
      interviewerName: interviewerName.trim(),
      interviewerTitle: interviewerTitle.trim(),
      company: company.trim(),
      role: role.trim(),
    })
    // The cheat sheet is the Pro-gated step: account → credits → generate.
    if (!hasAccount) return navigate('/signup', { state: { next: '/cheat-generating' } })
    if (needsCredits()) return navigate('/paywall')
    consumeSheet()
    navigate('/cheat-generating')
  }

  return (
    <AppShell>
      <div className="ci pop">
        <div className="ci-tile">
          <div className="ci-eyebrow mono-label">Interview cheat sheet</div>
          <h1 className="ci-head">
            Got an interview?
            <br />
            <span className="ci-teal">Let’s prep.</span>
          </h1>
          <p className="ci-sub">
            Tell us who you&rsquo;re meeting. We pull intel scoped to their team —
            why they&rsquo;re hiring, what&rsquo;s changing, what they care about —
            so you walk in ready. Not a generic company blurb.
          </p>

          <div className="ci-form">
            <label className="ci-field">
              <span className="ci-label mono-label">Who you&rsquo;re meeting — name</span>
              <input
                className="ci-input"
                value={interviewerName}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dana Lee"
                autoFocus
              />
            </label>
            <label className="ci-field">
              <span className="ci-label mono-label">Their title</span>
              <input
                className="ci-input"
                value={interviewerTitle}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. VP of Marketing"
              />
            </label>
            <label className="ci-field">
              <span className="ci-label mono-label">Company</span>
              <input
                className="ci-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Northwind"
              />
            </label>
            <label className="ci-field">
              <span className="ci-label mono-label">Role you&rsquo;re interviewing for</span>
              <input
                className="ci-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Content Strategist"
                onKeyDown={(e) => e.key === 'Enter' && build()}
              />
            </label>
          </div>

          {err && <div className="ci-err">{err}</div>}

          <button className="ci-submit" onClick={build}>
            Build my cheat sheet →
          </button>
          <div className="ci-fine mono-label">
            Free for your first sheet · Pro for more · you choose how it reads
          </div>
        </div>
      </div>
    </AppShell>
  )
}
