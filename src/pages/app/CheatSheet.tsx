import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import { PREFLIGHT } from '../../flow/data'
import './flow.css'
import './CheatSheet.css'

type Theme = 'calm' | 'light' | 'dark'

const SECTIONS: { id: string; num: string; label: string }[] = [
  { id: 'why', num: '01', label: 'Why they’re hiring' },
  { id: 'news', num: '02', label: 'Recent news' },
  { id: 'org', num: '03', label: 'Org & leadership' },
  { id: 'launch', num: '04', label: 'What’s launching' },
  { id: 'cares', num: '05', label: 'What they care about' },
  { id: 'posture', num: '06', label: 'Posture' },
  { id: 'preflight', num: '07', label: 'Pre-flight' },
]

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}

export function CheatSheet() {
  const navigate = useNavigate()
  const { interview, departmentBrief } = useAppFlow()

  const [active, setActive] = useState('why')
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  // Reader preferences default NEUTRAL — the user chooses; nothing is forced.
  const [theme, setTheme] = useState<Theme>(() => readStored<Theme>('tucasa:cheatTheme', 'calm'))
  const [adhd, setAdhd] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tucasa:cheatAdhd') === '1'
    } catch {
      return false
    }
  })

  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const jumpingUntil = useRef(0)

  // No intake yet (e.g. a refresh with nothing stored) → send them to build one.
  useEffect(() => {
    if (!interview) navigate('/cheat-intake', { replace: true })
  }, [interview, navigate])

  useEffect(() => {
    try {
      localStorage.setItem('tucasa:cheatTheme', theme)
    } catch {
      /* best-effort */
    }
  }, [theme])
  useEffect(() => {
    try {
      localStorage.setItem('tucasa:cheatAdhd', adhd ? '1' : '0')
    } catch {
      /* best-effort */
    }
  }, [adhd])

  const jumpTo = (id: string) => {
    setActive(id)
    jumpingUntil.current = Date.now() + 800
    const el = sectionRefs.current[id]
    const c = scrollRef.current
    if (!el || !c) return
    const top =
      el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - 18
    c.scrollTo({ top, behavior: 'smooth' })
  }

  // Scroll-spy: track the active section as the panel scrolls.
  useEffect(() => {
    const c = scrollRef.current
    if (!c) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < jumpingUntil.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const id = visible[0]?.target.getAttribute('data-sec')
        if (id) setActive(id)
      },
      { root: c, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [departmentBrief])

  if (!interview || !departmentBrief) return null
  const b = departmentBrief
  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el
  }
  const toggleCheck = (i: number) => setChecked((c) => ({ ...c, [i]: !c[i] }))
  const who = b.interviewerName || 'your interviewer'
  const dept = b.department === 'the team' ? 'their team' : `${b.department}`

  // A bulleted list — the base unit. In ADHD mode CSS calls out the first item
  // and opens up the spacing; no big blocks of text anywhere.
  const Bullets = ({ items }: { items: string[] }) => (
    <ul className="cheat-bullets">
      {items.map((t) => (
        <li key={t} className="cheat-bullet">
          {t}
        </li>
      ))}
    </ul>
  )

  return (
    <AppShell>
      <div className="cheat-grid pop">
        {/* Side nav */}
        <div className="cheat-nav">
          <div className="cheat-nav-eyebrow mono-label">Interview cheat sheet</div>
          <div className="cheat-nav-role">{b.role || interview.role}</div>
          <div className="cheat-nav-company mono-label">
            {b.company} · {b.department}
          </div>
          <div className="cheat-divider" />
          <div className="cheat-nav-list">
            {SECTIONS.map((n) => (
              <button
                key={n.id}
                className={`cheat-nav-item ${active === n.id ? 'is-active' : ''}`}
                onClick={() => jumpTo(n.id)}
              >
                <span className="cheat-nav-num">{n.num}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </div>
          <div className="cheat-divider" />

          {/* Reader controls — background + ADHD-friendly, both user's choice. */}
          <div className="cheat-controls">
            <div className="cheat-ctl-label mono-label">Reading</div>
            <div className="cheat-theme-seg" role="group" aria-label="Background">
              {(['calm', 'light', 'dark'] as Theme[]).map((t) => (
                <button
                  key={t}
                  className={`cheat-theme-opt ${theme === t ? 'is-on' : ''}`}
                  onClick={() => setTheme(t)}
                >
                  {t === 'calm' ? 'Calm' : t === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
            <button
              className={`cheat-adhd-toggle ${adhd ? 'is-on' : ''}`}
              onClick={() => setAdhd((v) => !v)}
              aria-pressed={adhd}
            >
              <span className="cheat-adhd-dot" aria-hidden />
              ADHD-friendly
            </button>
          </div>

          <button className="cheat-new-btn" onClick={() => navigate('/cheat-intake')}>
            + New cheat sheet
          </button>
        </div>

        {/* Content */}
        <div
          className={`cheat-content theme-${theme} ${adhd ? 'is-adhd' : ''}`}
          ref={scrollRef}
        >
          {b.sample && (
            <div className="cheat-sample">
              Sample intel — your live sheet pulls the real, current research for{' '}
              {b.company}.
            </div>
          )}

          {/* Intro */}
          <div className="cheat-intro">
            <div className="cheat-dept-chip">{b.department}</div>
            <h1 className="cheat-intro-head">
              Prepping for {b.role || 'the role'} at {b.company}.
            </h1>
            <div className="cheat-intro-meeting">
              Meeting <b>{who}</b>
              {b.interviewerTitle ? ` · ${b.interviewerTitle}` : ''}
            </div>
          </div>

          {/* 01 Why they're hiring */}
          <div data-sec="why" ref={setRef('why')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">01 · Why {dept} is hiring</div>
            <Bullets items={b.whyHiring} />
          </div>
          <div className="cheat-hairline" />

          {/* 02 Recent news */}
          <div data-sec="news" ref={setRef('news')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">02 · Recent {dept} news</div>
            <ul className="cheat-bullets">
              {b.recentNews.map((n) => (
                <li key={n.text} className="cheat-bullet">
                  {n.text}
                  {(n.source || n.date) && (
                    <span className="cheat-src mono-label">
                      {[n.source, n.date].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="cheat-hairline" />

          {/* 03 Org & leadership */}
          <div data-sec="org" ref={setRef('org')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">03 · Org &amp; leadership changes</div>
            <Bullets items={b.orgChanges} />
          </div>
          <div className="cheat-hairline" />

          {/* 04 What's launching */}
          <div data-sec="launch" ref={setRef('launch')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">04 · What they&rsquo;re launching</div>
            <Bullets items={b.launches} />
          </div>
          <div className="cheat-hairline" />

          {/* 05 What they care about */}
          <div data-sec="cares" ref={setRef('cares')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">05 · What {who} cares about</div>
            <Bullets items={b.interviewerCares} />
          </div>
          <div className="cheat-hairline" />

          {/* 06 Posture */}
          <div data-sec="posture" ref={setRef('posture')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">06 · Posture</div>
            <div className="cheat-posture">
              You&rsquo;re not being judged — you&rsquo;re both figuring out if this
              fits. Slow down, answer the question they asked, and it&rsquo;s fine to
              take two seconds before you speak.
            </div>
          </div>
          <div className="cheat-hairline" />

          {/* 07 Pre-flight */}
          <div data-sec="preflight" ref={setRef('preflight')} className="cheat-sec cheat-sec-last">
            <div className="cheat-sec-eyebrow mono-label">07 · Pre-flight</div>
            <div className="cheat-preflight">
              {PREFLIGHT.map((label, i) => {
                const on = !!checked[i]
                return (
                  <label key={label} className="cheat-pf-row" onClick={() => toggleCheck(i)}>
                    <span className={`cheat-pf-box ${on ? 'is-on' : ''}`}>{on ? '✓' : ''}</span>
                    <span className={`cheat-pf-label ${on ? 'is-on' : ''}`}>{label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
