import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdhdPanel } from '../components/AdhdPanel'
import { Logo } from '../components/Logo'
import './Landing.css'

interface EngineStep {
  key: string
  label: string
  desc: string
  icon: JSX.Element
}

// "One engine, search to offer" — the four-stage icon row (turn 24).
const ENGINE: EngineStep[] = [
  {
    key: 'find',
    label: 'FIND',
    desc: 'Scans ~40 job boards, then verifies each opening against the employer’s own ATS. No ghost jobs.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M21 21l-5.2-5.2" />
      </svg>
    ),
  },
  {
    key: 'measure',
    label: 'MEASURE UP',
    desc: 'Measures your résumé against the role’s real requirements. Honest fit scores, no keyword-stuffing.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
        <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
      </svg>
    ),
  },
  {
    key: 'apply',
    label: 'APPLY',
    desc: 'Company intel tailors your résumé to what this employer actually wants.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8.5 3.5h7a1 1 0 0 1 1 1V6a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
        <path d="M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    key: 'interview',
    label: 'INTERVIEW',
    desc: 'A live cheat sheet from real company research — likely questions, ready answers, what they care about.',
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    ),
  },
]

export function Landing() {
  const [adhdOpen, setAdhdOpen] = useState(false)
  const arrowsRef = useRef<HTMLDivElement>(null)

  // Bob the hero arrows apart/together as the page scrolls — a gentle wave
  // tied to scroll position. Respects reduced-motion.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const apply = () => {
      raf = 0
      const el = arrowsRef.current
      if (el) el.style.setProperty('--arrow-shift', `${Math.sin(window.scrollY / 70) * 7}px`)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    apply()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="lp">
      {/* Topbar */}
      <header className="lp-topbar">
        <div className="lp-topbar-in">
          <Logo to={null} />
          <div className="lp-topbar-right">
            <span className="lp-tag">Free for job seekers</span>
            <button
              className={`lp-adhd ${adhdOpen ? 'is-on' : ''}`}
              onClick={() => setAdhdOpen((v) => !v)}
            >
              <span aria-hidden>{adhdOpen ? '●' : '○'}</span> ADHD support
            </button>
          </div>
        </div>
      </header>

      {/* Hero — dark / teal split */}
      <section className="lp-band lp-hero-band">
        <div className="lp-in">
          <div className="lp-hero">
            <div className="lp-hero-ghost" aria-hidden>TUCASA</div>
            <div className="lp-hero-dark">
              <div className="lp-hero-eyebrow">Agentic. Composable. Built for humans.</div>
              <h1 className="lp-hero-head">
                REAL JOBS.
                <br />
                REAL FIT.
                <br />
                RIGHT NOW.
              </h1>
              <Link to="/upload" className="lp-cta lp-hero-cta">
                Upload your résumé — free →
              </Link>
            </div>
            <div className="lp-hero-teal" aria-hidden>
              <div className="lp-hero-arrows" ref={arrowsRef}>
                <svg width="34" height="34" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                <svg width="34" height="34" viewBox="0 0 24 24" stroke="#0b1020" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Band 1 · cream — pillars */}
      <section className="lp-band lp-band-cream">
        <div className="lp-in lp-pillars">
          <div className="lp-sec-head">
            <div className="lp-eyebrow lp-eyebrow-teal">Why we exist</div>
            <h2 className="lp-sec-title">
              Finding a genuine job should be this{' '}
              <span className="lp-burgundy">easy.</span>
            </h2>
          </div>

          {/* One engine, search to offer — icon row */}
          <div className="lp-engine">
            <div className="lp-eyebrow lp-eyebrow-teal">One engine, search to offer</div>
            <div className="lp-engine-row">
              {ENGINE.map((step, i) => (
                <div className="lp-engine-cell" key={step.key}>
                  {i > 0 && <span className="lp-engine-arrow" aria-hidden>→</span>}
                  <div className="lp-engine-step">
                    <span className="lp-engine-icon">{step.icon}</span>
                    <span className="lp-engine-label">{step.label}</span>
                    <span className="lp-engine-desc">{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Three pillar cards */}
          <div className="lp-cards">
            <div className="lp-card lp-card-navy">
              <div className="lp-card-title">Real jobs</div>
              <div className="lp-card-body">
                Live openings, pulled the moment they post. No stale listings, no
                ghost jobs.
              </div>
            </div>
            <div className="lp-card lp-card-teal">
              <div className="lp-card-title">Real fit</div>
              <div className="lp-card-body">
                Your résumé graded against each role’s real requirements. Why you
                fit, what’s missing.
              </div>
            </div>
            <div className="lp-card lp-card-burgundy">
              <div className="lp-card-title">Real support</div>
              <div className="lp-card-body">
                From first search to the interview — a live cheat sheet for the
                exact role.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Band 2 · dark — the difference + stats */}
      <section className="lp-band lp-band-dark">
        <div className="lp-in lp-diff">
          <div className="lp-sec-head">
            <div className="lp-eyebrow lp-eyebrow-bright">The difference</div>
            <h2 className="lp-sec-title lp-on-dark">
              We don’t match keywords.{' '}
              <span className="lp-bright">We match you.</span>
            </h2>
          </div>
          <div className="lp-stats">
            <div className="lp-stat">
              <div className="lp-stat-num">
                1<span className="lp-stat-unit">in 7</span>
              </div>
              <div className="lp-stat-desc">
                job postings are ghost jobs — live 30+ days with no real hiring.
              </div>
              <div className="lp-stat-src">
                Clarify Capital · 176,268 listings · Feb 2026
              </div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">
                4.76<span className="lp-stat-unit">interviews</span>
              </div>
              <div className="lp-stat-desc">
                is all the average seeker lands — from 62.6 applications.
              </div>
              <div className="lp-stat-src">United Way NCA survey · 2026</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">
                93<span className="lp-stat-unit">%</span>
              </div>
              <div className="lp-stat-desc">
                of HR pros say their employer posts ghost jobs — 45% regularly.
              </div>
              <div className="lp-stat-src">LiveCareer HR survey · Mar 2025</div>
            </div>
          </div>
        </div>
      </section>

      {/* Band 3 · cream — founder */}
      <section className="lp-band lp-band-cream">
        <div className="lp-in lp-founder">
          <div className="lp-founder-photo">
            <img src="/marcos.jpg" alt="Marcos Cuellar, founder of TuCasa" />
          </div>
          <div className="lp-founder-copy">
            <div className="lp-eyebrow lp-eyebrow-teal">Why trust us</div>
            <h2 className="lp-founder-head">
              I built this for my sister. It landed her the job. Now it’s for you.
            </h2>
            <p className="lp-founder-body">
              When my sister was job hunting, I pointed the AI engines I’d built
              at her search — verify a job is real, check the fit, research the
              company. It landed her the job.
            </p>
            <div className="lp-founder-quote">
              The cheat sheet I built for myself first — it predicted what they’d
              ask and was spot on. Now it builds one for you, for the exact role.
            </div>
            <p className="lp-founder-body">
              14 years in staffing. TuCasa is those same engines, rebuilt for job
              seekers — free.
            </p>
            <div className="lp-founder-by">
              <a
                className="lp-founder-name"
                href="https://www.linkedin.com/in/marcosmcuellar/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Marcos Cuellar
              </a>
              <span className="lp-founder-sep">·</span>
              <span className="lp-founder-role">Founder · 14 yrs in staffing</span>
            </div>
            <div className="lp-founder-chips">
              <span className="lp-founder-chip">14 yrs in staffing · GLVE</span>
              <span className="lp-founder-chip">Builds tools for ADHD folks</span>
            </div>
          </div>
        </div>
      </section>

      {/* Band 3b · burgundy — early-user quotes */}
      <section className="lp-band lp-band-burgundy">
        <div className="lp-in lp-quotes">
          <div className="lp-eyebrow lp-eyebrow-onburgundy">From early users</div>
          <div className="lp-quotes-grid">
            <figure className="lp-quote-feat">
              <blockquote>
                “The cheat sheet was right there on my screen — I could{' '}
                <span className="lp-bright">bounce topic to topic</span> and stay
                on track. Got the offer.”
              </blockquote>
              <figcaption className="lp-quote-by">
                <span className="lp-quote-av">SL</span>
                <span>
                  <span className="lp-quote-name">Sofia L.</span>
                  <span className="lp-quote-role">RECRUITER · AUSTIN</span>
                </span>
              </figcaption>
            </figure>
            <div className="lp-quote-stack">
              <figure className="lp-quote-sm">
                <blockquote>
                  “Had <span className="lp-teal-ink">9 real matches by lunch.</span>{' '}
                  No ghost jobs, no rabbit holes.”
                </blockquote>
                <figcaption className="lp-quote-by">
                  <span className="lp-quote-av lp-quote-av-teal">DR</span>
                  <span>
                    <span className="lp-quote-name">Dani R.</span>
                    <span className="lp-quote-role">DATA ANALYST · CHICAGO</span>
                  </span>
                </figcaption>
              </figure>
              <figure className="lp-quote-sm">
                <blockquote>
                  “The fit score told me which jobs to skip.{' '}
                  <span className="lp-teal-ink">That’s the part I needed.</span>”
                </blockquote>
                <figcaption className="lp-quote-by">
                  <span className="lp-quote-av lp-quote-av-navy">MO</span>
                  <span>
                    <span className="lp-quote-name">Marcus O.</span>
                    <span className="lp-quote-role">OPS MANAGER · REMOTE</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* Band 4 · dark — pricing */}
      <section className="lp-band lp-band-dark" id="pricing">
        <div className="lp-in lp-pricing">
          <div className="lp-pricing-head">
            <div className="lp-eyebrow lp-eyebrow-bright">Pricing</div>
            <h2 className="lp-sec-title lp-on-dark lp-pricing-title">
              Finding real jobs is free. Always.
            </h2>
            <p className="lp-pricing-sub">
              You never pay to search, verify, or see your fit. You only pay when
              the AI does personalized work for you — because that runs on a
              frontier model.
            </p>
          </div>
          <div className="lp-tiers">
            <div className="lp-tier">
              <div className="lp-tier-top">
                <span className="lp-tier-name">Free</span>
                <span className="lp-tier-price">$0 · no card</span>
              </div>
              <p className="lp-tier-desc">Everything you need to find the right roles.</p>
              <ul className="lp-tier-feats">
                <li>Verified matches from ~40 boards</li>
                <li>Ghost jobs filtered — every listing checked against the employer’s ATS</li>
                <li>Honest fit scores on every role</li>
                <li>Tailor your résumé for one role with AI</li>
              </ul>
              <Link to="/upload" className="lp-tier-cta">
                Upload your résumé — free
              </Link>
            </div>
            <div className="lp-tier lp-tier-pro">
              <span className="lp-tier-tag">Most seekers</span>
              <div className="lp-tier-top">
                <span className="lp-tier-name">Pro</span>
                <span className="lp-tier-price">$15/mo · cancel anytime</span>
              </div>
              <p className="lp-tier-desc">
                For when you’re actively interviewing. Everything in Free, plus:
              </p>
              <ul className="lp-tier-feats">
                <li>Unlimited AI résumé tailoring — re-done for each role</li>
                <li>Interview cheat sheets for every interview — company intel, likely questions, ready answers</li>
                <li>Up to 20 cheat sheets a month</li>
              </ul>
              <Link to="/signup" className="lp-tier-cta lp-tier-cta-pro">
                Go Pro
              </Link>
              <div className="lp-tier-note">
                Job hunts end. Cancel the moment you land the offer.
              </div>
            </div>
          </div>
          <div className="lp-pricing-foot">
            Built with Claude. AI-generated — always review before you send.
          </div>
        </div>
      </section>

      {/* Final CTA · cream */}
      <section className="lp-band lp-band-cream">
        <div className="lp-in lp-final">
          <h2 className="lp-final-head">
            Apply to less ghost jobs. To land{' '}
            <span className="lp-teal-ink">the right one.</span>
          </h2>
          <Link to="/upload" className="lp-cta lp-cta-lg">
            Upload your résumé — free →
          </Link>
          <div className="lp-final-note">
            Free for job seekers · no credit card · no catch
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-band lp-band-cream lp-footer-band">
        <div className="lp-in lp-footer">
          <Logo to="/" size={12} />
          <div className="lp-footer-right">
            <span>free for job seekers, always</span>
            <a
              className="lp-footer-credit"
              href="https://www.linkedin.com/in/marcosmcuellar/"
              target="_blank"
              rel="noopener noreferrer"
            >
              by Marcos Cuellar
            </a>
          </div>
        </div>
      </footer>

      {adhdOpen && <AdhdPanel onClose={() => setAdhdOpen(false)} />}
    </div>
  )
}
