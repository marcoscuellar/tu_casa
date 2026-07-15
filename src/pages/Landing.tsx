import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useClock } from '../lib/useClock'
import { AdhdPanel } from '../components/AdhdPanel'
import { Logo } from '../components/Logo'
import './Landing.css'

interface Step {
  id: string
  n: string
  name: string
  body: string
}

// "How the AI works" — the four-step accordion (Wine · Teal handoff).
const STEPS: Step[] = [
  {
    id: 'search',
    n: '01',
    name: 'Search',
    body: 'Thousands of live openings, scanned in real time from a single résumé upload — no manual searching, no stale tabs.',
  },
  {
    id: 'verify',
    n: '02',
    name: 'Verify',
    body: 'Expired posts, duplicate reposts, and ghost jobs are thrown out before they ever reach your list.',
  },
  {
    id: 'match',
    n: '03',
    name: 'Match',
    body: 'Your full experience — skills, seniority, recency — graded against each role. Best fits first, every score explained.',
  },
  {
    id: 'prep',
    n: '04',
    name: 'Interview prep',
    body: 'A live cheat sheet for the exact role: company research, likely questions with drafted answers, and a pre-flight checklist.',
  },
]

export function Landing() {
  const clock = useClock()
  const [open, setOpen] = useState<string | null>('search')
  const [adhdOpen, setAdhdOpen] = useState(false)
  const arrowsRef = useRef<HTMLDivElement>(null)

  // Gentle scroll-bob on the hero sort arrows — the motion Marcos asked for.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const apply = () => {
      raf = 0
      const el = arrowsRef.current
      if (el) el.style.setProperty('--arrow-shift', `${Math.sin(window.scrollY / 70) * 6}px`)
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
      <div className="lp-wrap">
        {/* Topbar */}
        <header className="lp-topbar">
          <div className="lp-topbar-left">
            <Logo to={null} />
            <span className="lp-tag">Free for job seekers</span>
          </div>
          <div className="lp-topbar-right">
            <span className="lp-clock">{clock}</span>
            <button
              className={`lp-adhd ${adhdOpen ? 'is-on' : ''}`}
              onClick={() => setAdhdOpen((v) => !v)}
            >
              <span aria-hidden>{adhdOpen ? '●' : '○'}</span> ADHD support
            </button>
          </div>
        </header>

        {/* Hero — near-black tile, wordmark bleed, teal sort panel */}
        <section className="lp-hero">
          <div className="lp-hero-eyebrow">AI-powered job search</div>
          <h1 className="lp-hero-head">
            REAL JOBS.
            <br />
            REAL FIT.
            <br />
            RIGHT NOW.
          </h1>
          <div className="lp-hero-ghost" aria-hidden>
            TuCasa
          </div>
          <div className="lp-hero-panel" aria-hidden>
            <div className="lp-hero-arrows" ref={arrowsRef}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 8 4-4 4 4" />
                <path d="M7 4v16" />
                <path d="m21 16-4 4-4-4" />
                <path d="M17 20V4" />
              </svg>
            </div>
          </div>
        </section>

        {/* Why we exist — white statement tile */}
        <section className="lp-tile lp-tile-light lp-statement">
          <div className="lp-eyebrow lp-eyebrow-wine">Why we exist</div>
          <h2 className="lp-statement-head">
            Finding a genuine job
            <br />
            should be this&nbsp;<span className="lp-wine">easy.</span>
          </h2>
        </section>

        {/* Description + CTA row — near-black tile */}
        <section className="lp-tile lp-tile-dark lp-desc">
          <p className="lp-desc-text">
            Drop your résumé.{' '}
            <span className="lp-teal-bright">AI searches hundreds of job sites,</span>{' '}
            ranks the ones built for you, and preps you to win the interview.
          </p>
          <div className="lp-desc-cta">
            <Link to="/upload" className="lp-btn lp-btn-wine">
              Upload your résumé — free
            </Link>
            <div className="lp-desc-note">Every match verified. No inflated scores.</div>
          </div>
        </section>

        {/* Three pillars — white / teal / wine */}
        <div className="lp-cards">
          <div className="lp-card lp-card-white">
            <svg width="26" height="26" viewBox="0 0 24 24" stroke="#0a0a0a" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="12" r="6" />
              <circle cx="15" cy="12" r="6" />
            </svg>
            <div>
              <div className="lp-card-title lp-card-title-ink">Real jobs</div>
              <div className="lp-card-body lp-card-body-muted">
                Live openings, pulled the moment they post. No stale listings, no
                ghost jobs.
              </div>
            </div>
          </div>
          <div className="lp-card lp-card-teal">
            <svg width="26" height="26" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3v6M9 13v8M15 3v14M15 21v-2" />
            </svg>
            <div>
              <div className="lp-card-title lp-card-title-white">Real fit</div>
              <div className="lp-card-body lp-card-body-onteal">
                Your résumé graded against each role&rsquo;s real requirements. See
                why you fit, what&rsquo;s missing, and whether it&rsquo;s worth
                applying.
              </div>
            </div>
          </div>
          <div className="lp-card lp-card-wine">
            <svg width="26" height="26" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v12H8l-4 4V4z" />
            </svg>
            <div>
              <div className="lp-card-title lp-card-title-white">Real support</div>
              <div className="lp-card-body lp-card-body-onwine">
                From your first search to the interview itself — a live cheat sheet
                built from your background and the exact role.
              </div>
            </div>
          </div>
        </div>

        {/* The difference — near-black statement tile */}
        <section className="lp-tile lp-tile-dark lp-statement">
          <div className="lp-eyebrow lp-eyebrow-bright">The difference</div>
          <h2 className="lp-statement-head lp-on-dark">
            WE DON&rsquo;T MATCH
            <br />
            KEYWORDS. <span className="lp-teal-bright">WE MATCH YOU.</span>
          </h2>
        </section>

        {/* How the AI works — white tile, accordion */}
        <section className="lp-tile lp-tile-light lp-how">
          <div className="lp-eyebrow lp-eyebrow-wine">How the AI works</div>
          <div className="lp-how-lead">
            Four steps, start to interview. Every one grounded in your actual
            experience.
          </div>
          <div className="lp-how-grid">
            {STEPS.map((it) => {
              const isOpen = open === it.id
              return (
                <div
                  key={it.id}
                  className={`lp-acc ${isOpen ? 'is-open' : ''}`}
                  onClick={() => setOpen(isOpen ? null : it.id)}
                >
                  <div className="lp-acc-top">
                    <span className="lp-acc-name">{it.name}</span>
                    <span className="lp-acc-sign">{isOpen ? '−' : '+'}</span>
                  </div>
                  <div className="lp-acc-n">{it.n}</div>
                  {isOpen ? (
                    <div className="lp-acc-body">{it.body}</div>
                  ) : (
                    <div className="lp-acc-spacer" />
                  )}
                </div>
              )
            })}
          </div>
          <div className="lp-how-foot">
            Search and match run twice — the second pass is why you can trust the
            first.
          </div>
        </section>

        {/* Stats band — near-black tile, cited figures */}
        <section className="lp-tile lp-tile-dark lp-stats">
          <div className="lp-eyebrow lp-eyebrow-bright">The market you&rsquo;re up against</div>
          <div className="lp-stats-grid">
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
        </section>

        {/* Founder — white tile */}
        <section className="lp-tile lp-tile-light lp-founder">
          <div className="lp-founder-photo">
            <img src="/marcos.jpg" alt="Marcos Cuellar, founder of TuCasa" />
          </div>
          <div className="lp-founder-copy">
            <div className="lp-eyebrow lp-eyebrow-wine">Why trust us</div>
            <h2 className="lp-founder-head">
              I built this to help my sister with her job search. It became the
              starting point for TuCasa.
            </h2>
            <p className="lp-founder-body">
              A few years ago, I created GLVE, an agentic, composable sales engine
              built to research companies, identify opportunities, and help teams
              act on the right signals. When my sister started looking for a new
              job, I adapted that same technology for her.
            </p>
            <div className="lp-founder-quote">
              It helped verify which roles were real, understand where she was a
              strong match, research the companies behind them, and focus her time
              on the opportunities that were actually worth pursuing.
            </div>
            <p className="lp-founder-body">
              That experience became the foundation for TuCasa.
            </p>
            <div className="lp-founder-by">
              <a
                className="lp-founder-name"
                href="https://dosystems.app"
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
        </section>

        {/* Early-user quotes — wine tile */}
        <section className="lp-tile lp-tile-wine lp-quotes">
          <div className="lp-eyebrow lp-eyebrow-onwine">From early users</div>
          <div className="lp-quotes-grid">
            <figure className="lp-quote-feat">
              <blockquote>
                “I thought this was going to be just another data collector. This
                is <span className="lp-teal-bright">actual real stuff</span> — it
                makes the scariest part of the process concrete.”
              </blockquote>
              <figcaption className="lp-quote-by">
                <span className="lp-quote-av">AF</span>
                <span>
                  <span className="lp-quote-name">Anthony F.</span>
                  <span className="lp-quote-role">RETAIL OPERATIONS MANAGER</span>
                </span>
              </figcaption>
            </figure>
            <div className="lp-quote-stack">
              <figure className="lp-quote-sm">
                <blockquote>
                  “I’ve tried the other AI recruiter tools. This one had{' '}
                  <span className="lp-teal-ink">results</span> — and introduced me
                  to companies I’d never heard of.”
                </blockquote>
                <figcaption className="lp-quote-by">
                  <span className="lp-quote-av lp-quote-av-teal">JV</span>
                  <span>
                    <span className="lp-quote-name">James V.</span>
                    <span className="lp-quote-role">CREATIVE DIRECTOR</span>
                  </span>
                </figcaption>
              </figure>
              <figure className="lp-quote-sm">
                <blockquote>
                  “Résumé review, the AI guiding me through the entire process — it
                  felt like{' '}
                  <span className="lp-teal-ink">I had my own recruiter</span> the
                  whole way.”
                </blockquote>
                <figcaption className="lp-quote-by">
                  <span className="lp-quote-av lp-quote-av-teal">EM</span>
                  <span>
                    <span className="lp-quote-name">Elizabeth M.</span>
                    <span className="lp-quote-role">IT DIRECTOR</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Pricing — near-black tile */}
        <section className="lp-tile lp-tile-dark lp-pricing" id="pricing">
          <div className="lp-pricing-head">
            <div className="lp-eyebrow lp-eyebrow-bright">Pricing</div>
            <h2 className="lp-pricing-title">Finding real jobs is free. Always.</h2>
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
        </section>

        {/* The trade — wine statement tile */}
        <section className="lp-tile lp-tile-wine lp-statement">
          <div className="lp-eyebrow lp-eyebrow-onwine-dim">The trade</div>
          <h2 className="lp-statement-head lp-on-dark">
            ONE RÉSUMÉ IN.
            <br />
            A SHORTLIST WORTH
            <br />
            YOUR TIME, OUT.
          </h2>
        </section>

        {/* Final CTA — white tile */}
        <section className="lp-tile lp-tile-light lp-final">
          <h2 className="lp-final-head">
            APPLY TO LESS GHOST JOBS.
            <br />
            TO LAND&nbsp;<span className="lp-wine">THE RIGHT ONE.</span>
          </h2>
          <p className="lp-final-sub">
            Real matches, honest fit, and a cheat sheet for the interview — all
            free.
          </p>
          <Link to="/upload" className="lp-btn lp-btn-teal lp-btn-lg">
            Upload your résumé — free
          </Link>
          <div className="lp-final-note">
            Free for job seekers. No credit card. No catch.
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <span>tucasa</span>
          <span className="lp-footer-right">
            free for job seekers, always ·{' '}
            <a
              className="lp-footer-link"
              href="https://dosystems.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              by Marcos Cuellar
            </a>
          </span>
        </footer>
      </div>

      {adhdOpen && <AdhdPanel onClose={() => setAdhdOpen(false)} />}
    </div>
  )
}
