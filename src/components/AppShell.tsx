import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AdhdPanel } from './AdhdPanel'
import { Logo } from './Logo'
import { useAppFlow } from '../flow/AppFlowContext'
import './AppShell.css'

const NAV: { label: string; to: string }[] = [
  { label: 'Discovery', to: '/discovery' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Profile', to: '/account' },
  { label: 'Résumé', to: '/builder' },
  { label: 'Cheat sheets', to: '/cheatsheet' },
]

/** Initials for the avatar, from the candidate's name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'ME'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Quiet top nav (board turn 22): logo · centered pill nav · ADHD + avatar,
 *  with a stat strip (matches · top fit · saved) beneath. */
export function TopBar() {
  const { pathname } = useLocation()
  const { candidateName, jobs } = useAppFlow()
  const [adhdOpen, setAdhdOpen] = useState(false)

  const topFit = jobs.reduce((m, j) => Math.max(m, j.fit.score), 0)
  let savedCount = 0
  try {
    savedCount = (JSON.parse(localStorage.getItem('tucasa:savedList') ?? '[]') as unknown[]).length
  } catch {
    savedCount = 0
  }

  return (
    <>
      <div className="tc-nav">
        <div className="tc-nav-bar">
          <Logo to="/discovery" size={14} />
          <nav className="tc-nav-links">
            {NAV.map((item) => {
              const active = pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`tc-nav-link ${active ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="tc-nav-right">
            <button
              className="tc-adhd-pill"
              onClick={() => setAdhdOpen(true)}
              aria-haspopup="dialog"
            >
              ✦ ADHD
            </button>
            <span className="tc-nav-avatar" aria-hidden>
              {initials(candidateName)}
            </span>
          </div>
        </div>
        <div className="tc-nav-strip">
          <div className="tc-stat">
            <span className="tc-stat-num">{jobs.length}</span>
            <span className="tc-stat-label mono-label">matches</span>
          </div>
          <span className="tc-stat-dot" />
          <div className="tc-stat">
            <span className="tc-stat-num tc-stat-teal">{topFit || '—'}</span>
            <span className="tc-stat-label mono-label">top fit</span>
          </div>
          <span className="tc-stat-dot" />
          <div className="tc-stat">
            <span className="tc-stat-num">{savedCount}</span>
            <span className="tc-stat-label mono-label">saved</span>
          </div>
          <span className="tc-nav-updated mono-label">Live</span>
        </div>
      </div>
      {adhdOpen && <AdhdPanel onClose={() => setAdhdOpen(false)} />}
    </>
  )
}

/** Wraps an app-flow screen with the shared top nav + centered page container. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="tc-screen">
      <TopBar />
      <div className="tc-page">{children}</div>
    </div>
  )
}
