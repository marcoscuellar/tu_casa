import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AdhdPanel } from './AdhdPanel'
import { Logo } from './Logo'
import { SoftSignup } from './SoftSignup'
import { useAppFlow, type AccountGate } from '../flow/AppFlowContext'
import { track } from '../lib/analytics'
import './AppShell.css'

// Free core — usable with no account at all.
const FREE_NAV: { label: string; to: string }[] = [
  { label: 'Discovery', to: '/discovery' },
  { label: 'Résumé', to: '/builder' },
]
// Account features — gated until a soft signup exists.
const GATED_NAV: { label: string; to: string }[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Profile', to: '/account' },
  { label: 'Cheat sheets', to: '/cheat-intake' },
]

// The nudge shown when a pre-credential visitor taps a gated item.
const NAV_GATE: AccountGate = {
  title: 'Create a quick profile to unlock this',
  sub: 'Save your shortlist and unlock your dashboard, profile, and cheat sheets. Takes 10 seconds.',
}

/** Initials for the avatar, from the candidate's name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'ME'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Quiet top nav: logo · centered pill nav · ADHD + avatar, with a stat strip.
 *  Pre-credential visitors see only the free items; account items are
 *  de-emphasized and nudge to a soft signup on click. */
export function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { candidateName, jobs, hasAccount, requireAccount } = useAppFlow()
  const [adhdOpen, setAdhdOpen] = useState(false)

  const topFit = jobs.reduce((m, j) => Math.max(m, j.fit.score), 0)
  let savedCount = 0
  try {
    savedCount = (JSON.parse(localStorage.getItem('tucasa:savedList') ?? '[]') as unknown[]).length
  } catch {
    savedCount = 0
  }

  // Tapping a gated item → soft signup, then continue to that page.
  const promptForGated = (to: string) => {
    track('gated_nav_click', { to })
    requireAccount(() => navigate(to), NAV_GATE)
  }

  return (
    <>
      <div className="tc-nav">
        <div className="tc-nav-bar">
          <Logo to="/discovery" size={14} />
          <nav className="tc-nav-links">
            {FREE_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`tc-nav-link ${pathname === item.to ? 'is-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
            {GATED_NAV.map((item) =>
              hasAccount ? (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`tc-nav-link ${pathname === item.to ? 'is-active' : ''}`}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.to}
                  type="button"
                  className="tc-nav-link tc-nav-locked"
                  title="Create a quick profile to unlock this"
                  onClick={() => promptForGated(item.to)}
                >
                  {item.label}
                  <span className="tc-lock" aria-hidden>
                    🔒
                  </span>
                </button>
              ),
            )}
          </nav>
          <div className="tc-nav-right">
            <button
              className="tc-adhd-pill"
              onClick={() => setAdhdOpen(true)}
              aria-haspopup="dialog"
            >
              ✦ ADHD
            </button>
            {hasAccount ? (
              <span className="tc-nav-avatar" aria-hidden>
                {initials(candidateName)}
              </span>
            ) : (
              <button
                type="button"
                className="tc-nav-avatar tc-nav-avatar-ghost"
                title="Create a quick profile"
                onClick={() => promptForGated('/account')}
                aria-label="Create a quick profile"
              >
                +
              </button>
            )}
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
      <SoftSignup />
    </div>
  )
}
