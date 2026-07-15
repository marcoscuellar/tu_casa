import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './flow.css'
import './CheatGen.css'

export function CheatGen() {
  const navigate = useNavigate()
  const { interview, departmentBrief } = useAppFlow()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // In production this is driven off the real Engine 5 research completion.
  // Here we simulate the ~2.2s build, then reveal the sheet.
  useEffect(() => {
    if (!interview) {
      navigate('/cheat-intake', { replace: true })
      return
    }
    timer.current = setTimeout(() => navigate('/cheatsheet'), 2200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [navigate, interview])

  const company = interview?.company || 'the company'
  const dept = departmentBrief?.department && departmentBrief.department !== 'the team'
    ? departmentBrief.department
    : 'the team'

  return (
    <AppShell>
      <div className="blk blk-black cheatgen pop">
        <div className="cheatgen-spinner" />
        <div className="eyebrow cheatgen-eyebrow">Building your cheat sheet</div>
        <h1 className="head cheatgen-head">
          Researching {company}
          <br />
          so you don&rsquo;t have to.
        </h1>
        <div className="cheatgen-steps">
          <div className="cheatgen-step">
            <span className="cheatgen-tick">✓</span> {dept} — why they&rsquo;re
            hiring
          </div>
          <div className="cheatgen-step">
            <span className="cheatgen-tick">✓</span> Recent news, org &amp;
            launches
          </div>
          <div className="cheatgen-step cheatgen-step-pending">
            <span className="cheatgen-ring" /> What your interviewer cares about
          </div>
        </div>
      </div>
    </AppShell>
  )
}
