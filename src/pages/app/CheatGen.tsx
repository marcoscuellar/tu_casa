import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './flow.css'
import './CheatGen.css'

export function CheatGen() {
  const navigate = useNavigate()
  const { cheatCompany } = useAppFlow()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // In production this is driven off the real research/generation job's
  // completion. Here we simulate the ~2.2s build, then reveal the sheet.
  useEffect(() => {
    timer.current = setTimeout(() => navigate('/cheatsheet'), 2200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [navigate])

  return (
    <AppShell>
      <div className="blk blk-black cheatgen pop">
        <div className="cheatgen-spinner" />
        <div className="eyebrow cheatgen-eyebrow">Building your cheat sheet</div>
        <h1 className="head cheatgen-head">
          Researching {cheatCompany}
          <br />
          so you don&rsquo;t have to.
        </h1>
        <div className="cheatgen-steps">
          <div className="cheatgen-step">
            <span className="cheatgen-tick">✓</span> Company &amp; product,
            current signals
          </div>
          <div className="cheatgen-step">
            <span className="cheatgen-tick">✓</span> Likely questions for this
            role
          </div>
          <div className="cheatgen-step cheatgen-step-pending">
            <span className="cheatgen-ring" /> Drafting answers from your
            background
          </div>
        </div>
      </div>
    </AppShell>
  )
}
