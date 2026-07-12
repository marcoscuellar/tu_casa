import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useClock } from '../lib/useClock'
import { AdhdPanel } from './AdhdPanel'
import './AppShell.css'

/** Shared top bar for the app-flow screens. */
export function TopBar() {
  const clock = useClock()
  const [adhdOpen, setAdhdOpen] = useState(false)
  return (
    <>
      <div className="tc-topbar">
        <span className="tc-topbar-dot" />
        <Link to="/" className="tc-wordmark">
          TUCASA
        </Link>
        <span className="tc-topbar-tag">Free for job seekers</span>
        <span className="tc-topbar-clock">{clock}</span>
        <button
          className="tc-adhd-pill"
          onClick={() => setAdhdOpen(true)}
          aria-haspopup="dialog"
        >
          ◇ ADHD Support
        </button>
      </div>
      {adhdOpen && <AdhdPanel onClose={() => setAdhdOpen(false)} />}
    </>
  )
}

/** Wraps an app-flow screen with the shared top bar + centered page container. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="tc-screen">
      <TopBar />
      <div className="tc-page">{children}</div>
    </div>
  )
}
