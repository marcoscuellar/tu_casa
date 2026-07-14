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

  // Bob the hero arrows apart/together as the page scrolls — the down arrow
  // dips, the up arrow lifts, tracing a gentle wave tied to scroll position.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const apply = () => {
      raf = 0
      const el = arrowsRef.current
      if (el) el.style.setProperty('--arrow-shift', `${Math.sin(window.scrollY / 70) * 9}px`)
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
        <div className="lp-topbar">
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
              <span>{adhdOpen ? '●' : '○'}</span> ADHD support
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="lp-hero">
          <div className="lp-hero-eyebrow">AI-powered job search</div>
          <div className="lp-hero-head">
            REAL JOBS.
            <br />
            REAL FIT.
            <br />
            RIGHT NOW.
          </div>
          <div className="lp-hero-ghost" aria-hidden>
            TUCASA
          </div>
          {/* Solid red rail with a down + up arrow pair (white). */}
          <div className="lp-hero-rail" aria-hidden>
            <div className="lp-hero-arrows" ref={arrowsRef}>
              <svg width="46" height="46" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <svg width="46" height="46" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Statement — why we exist */}
        <div className="lp-band lp-band-white">
          <div className="lp-band-eyebrow lp-eyebrow-red">Why we exist</div>
          <div className="lp-band-big lp-band-big-ink">
            Finding a genuine job
            <br />
            should be this&nbsp;<span className="lp-teal">easy.</span>
          </div>
        </div>

        {/* Description + CTA */}
        <div className="lp-desc">
          <p className="lp-desc-text">
            Drop your résumé.{' '}
            <span className="lp-red">AI hunts hundreds of job sites,</span> ranks
            the ones built for you, and preps you to win the interview.
          </p>
          <div className="lp-desc-cta">
            <Link to="/upload" className="lp-pill">
              Upload your résumé — free
            </Link>
            <Link to="/builder" className="lp-alt-cta">
              No résumé yet? Build one free →
            </Link>
            <div className="lp-desc-note">Every match verified. No inflated scores.</div>
          </div>
        </div>

        {/* Three tiles */}
        <div className="lp-tiles">
          <div className="lp-tile lp-tile-white">
            <svg width="26" height="26" viewBox="0 0 24 24" stroke="#0a0a0a" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="12" r="6" />
              <circle cx="15" cy="12" r="6" />
            </svg>
            <div>
              <div className="lp-tile-title lp-tile-title-ink">Real jobs</div>
              <div className="lp-tile-body lp-tile-body-muted">
                Live openings, pulled the moment they post. No stale listings, no
                ghost jobs.
              </div>
            </div>
          </div>
          <div className="lp-tile lp-tile-black">
            <svg width="26" height="26" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3v6M9 13v8M15 3v14M15 21v-2" />
            </svg>
            <div>
              <div className="lp-tile-title lp-tile-title-white">Real fit</div>
              <div className="lp-tile-body lp-tile-body-dark">
                Your résumé graded against each role&rsquo;s real requirements. See
                why you fit, what&rsquo;s missing, and whether it&rsquo;s worth
                applying.
              </div>
            </div>
          </div>
          <div className="lp-tile lp-tile-red">
            <svg width="26" height="26" viewBox="0 0 24 24" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v12H8l-4 4V4z" />
            </svg>
            <div>
              <div className="lp-tile-title lp-tile-title-white">Real support</div>
              <div className="lp-tile-body lp-tile-body-onred">
                From your first search to the interview itself — a live cheat sheet
                built from your background and the exact role.
              </div>
            </div>
          </div>
        </div>

        {/* Statement — the difference */}
        <div className="lp-band lp-band-black">
          <div className="lp-band-eyebrow lp-eyebrow-red">The difference</div>
          <div className="lp-band-big lp-band-big-white">
            WE DON&rsquo;T MATCH
            <br />
            KEYWORDS. <span className="lp-red">WE MATCH YOU.</span>
          </div>
        </div>

        {/* How the AI works */}
        <div className="lp-how">
          <div className="lp-band-eyebrow lp-eyebrow-red lp-how-eyebrow">
            How the AI works
          </div>
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
        </div>

        {/* Stats band */}
        <div className="lp-band lp-band-black lp-stats">
          <div className="lp-band-eyebrow lp-eyebrow-red lp-stats-eyebrow">
            The hours you get back
          </div>
          <div className="lp-stats-grid">
            <div className="lp-stat">
              <div className="lp-stat-num">
                11<span className="lp-stat-unit">hrs</span>
              </div>
              <div className="lp-stat-body">
                a week the average seeker spends scrolling listings. We hand it
                back.
              </div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">
                43<span className="lp-stat-unit">%</span>
              </div>
              <div className="lp-stat-body">
                of postings are stale or ghost jobs. You never see them.
              </div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-num">
                3<span className="lp-stat-unit">×</span>
              </div>
              <div className="lp-stat-body">
                more likely to walk into the interview actually prepared.
              </div>
            </div>
          </div>
        </div>

        {/* Statement — the trade */}
        <div className="lp-band lp-band-red">
          <div className="lp-band-eyebrow lp-eyebrow-onred">The trade</div>
          <div className="lp-band-big lp-band-big-white">
            ONE RÉSUMÉ IN.
            <br />
            <span className="lp-onred">
              A SHORTLIST WORTH <br className="lp-br-desk" /> YOUR TIME, OUT.
            </span>
          </div>
        </div>

        {/* Founder — built by a staffing insider (turn 11) */}
        <section className="lp-founder">
          <div className="lp-founder-main">
            <div className="lp-founder-photo">
              <img src="/marcos.jpg" alt="Marcos Cuellar, founder of TuCasa" />
            </div>
            <div className="lp-founder-copy">
              <div className="lp-founder-eyebrow">Why trust us</div>
              <h2 className="lp-founder-head">
                I built this for my sister. It landed her the job. Now it&rsquo;s
                for you.
              </h2>
              <p className="lp-founder-body">
                14 years in staffing. I built the AI engines recruiters rely on —
                one that verifies a job is real, one that checks whether a
                candidate actually fits, and one that researches the company
                behind the role. When my sister was job hunting, I pointed all
                three at her search. It landed her the job. TuCasa is those same
                engines, rebuilt for job seekers — free.
              </p>
              <div className="lp-founder-quote">
                The interview cheat sheet? I built that for me first. I pointed my
                client intelligence engine at the company and asked it to predict
                what they&rsquo;d ask — it pulled real intel, past and where
                they&rsquo;re headed, and even flagged their AI capabilities so I
                could speak to it. It was spot on. That&rsquo;s the reason I
                stopped walking into interviews cold. Now it builds one for you,
                automatically, for the exact role.
              </div>
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
          <div className="lp-founder-engine">
            <div className="lp-founder-eyebrow">One engine, search to offer</div>
            <div className="lp-engine-steps">
              {[
                ['01', 'Find', 'Scans ~40 job boards, then verifies openings against the employer’s own ATS. No ghost jobs.'],
                ['02', 'Fit', 'QA’s your résumé against the role’s real requirements. Honest scores, no keyword-stuffing.'],
                ['03', 'Apply', 'Company intel tailors your résumé to what this employer actually wants.'],
                ['04', 'Interview', 'Builds a live cheat sheet from real company research — questions, answers, and what they care about.'],
              ].map(([n, label, desc], i) => (
                <div className="lp-engine-cell" key={n}>
                  {i > 0 && <span className="lp-engine-arrow" aria-hidden>→</span>}
                  <div className="lp-engine-step">
                    <div className="lp-engine-top">
                      <span className="lp-engine-n">{n}</span>
                      <span className="lp-engine-label">{label}</span>
                    </div>
                    <div className="lp-engine-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-engine-foot">
              The same engines recruiters pay for — now pointed at your job hunt.
            </div>
          </div>
        </section>

        {/* Trust / proof (turn 10) */}
        <section className="lp-trust">
          <div className="lp-trust-stats">
            <div className="lp-trust-eyebrow">Proof, not promises</div>
            <div className="lp-trust-grid">
              <div className="lp-stat-item">
                <div className="lp-stat-num">
                  1<span className="lp-stat-unit"> in 7</span>
                </div>
                <div className="lp-stat-desc">
                  job postings are ghost jobs — live 30+ days with no real hiring.
                  We filter them out.
                </div>
                <div className="lp-stat-src">
                  Clarify Capital · 176,268 Indeed listings · Feb 2026
                </div>
              </div>
              <div className="lp-stat-item">
                <div className="lp-stat-num">
                  4.76<span className="lp-stat-unit"> interviews</span>
                </div>
                <div className="lp-stat-desc">
                  is all the average seeker lands — from 62.6 applications. We fix
                  the ratio.
                </div>
                <div className="lp-stat-src">
                  United Way NCA job-search survey · 2026
                </div>
              </div>
              <div className="lp-stat-item">
                <div className="lp-stat-num">
                  93<span className="lp-stat-unit">%</span>
                </div>
                <div className="lp-stat-desc">
                  of HR pros say their employer posts ghost jobs — 45% do it
                  regularly.
                </div>
                <div className="lp-stat-src">LiveCareer HR survey · Mar 2025</div>
              </div>
            </div>
          </div>

          <div className="lp-trust-quotes-head">
            <div className="lp-trust-eyebrow-teal">From early users</div>
            <div className="lp-trust-sample">sample — swap with real beta quotes</div>
          </div>
          <div className="lp-trust-quotes">
            <div className="lp-quote">
              <div className="lp-quote-text">
                “Uploaded my résumé, had 9 real matches by lunch. No ghost jobs, no
                rabbit holes.”
              </div>
              <div className="lp-quote-by">
                <div className="lp-quote-av">DR</div>
                <div>
                  <div className="lp-quote-name">Dani R.</div>
                  <div className="lp-quote-role">Data analyst · Chicago</div>
                </div>
              </div>
            </div>
            <div className="lp-quote">
              <div className="lp-quote-text">
                “The fit score told me which jobs to skip. That’s the part I
                actually needed.”
              </div>
              <div className="lp-quote-by">
                <div className="lp-quote-av lp-quote-av-dark">MO</div>
                <div>
                  <div className="lp-quote-name">Marcus O.</div>
                  <div className="lp-quote-role">Ops manager · remote</div>
                </div>
              </div>
            </div>
            <div className="lp-quote">
              <div className="lp-quote-text">
                “Walked into the interview with the cheat sheet already in my head.
                Got the offer.”
              </div>
              <div className="lp-quote-by">
                <div className="lp-quote-av">SL</div>
                <div>
                  <div className="lp-quote-name">Sofia L.</div>
                  <div className="lp-quote-role">Recruiter · Austin</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-trust-free">
            <div>
              <div className="lp-free-title">
                Free for job seekers. So how do we eat?
              </div>
              <div className="lp-free-desc">
                Finding real jobs and checking your fit stays free — always. When
                you&rsquo;re actively interviewing, Pro ($15/mo) unlocks cheat
                sheets and unlimited résumé tailoring. Those subscriptions fund
                the whole thing.
              </div>
            </div>
            <div className="lp-free-chip">No card · No catch</div>
          </div>
        </section>

        {/* Pricing */}
        <section className="lp-pricing" id="pricing">
          <div className="lp-pricing-head">
            <div className="lp-pricing-eyebrow">Pricing</div>
            <h2 className="lp-pricing-title">Finding real jobs is free. Always.</h2>
            <p className="lp-pricing-sub">
              You never pay to search, verify, or see your fit. You only pay when
              the AI does personalized work for you — because that runs on a
              frontier model.
            </p>
          </div>

          <div className="lp-tiers">
            {/* Free */}
            <div className="lp-tier">
              <div className="lp-tier-name">Free</div>
              <div className="lp-tier-price">
                $0<span className="lp-tier-per"> · no card</span>
              </div>
              <p className="lp-tier-desc">Everything you need to find the right roles.</p>
              <ul className="lp-tier-feats">
                <li>Verified matches from ~40 boards</li>
                <li>Ghost jobs filtered — every listing checked against the employer&rsquo;s ATS</li>
                <li>Honest fit scores on every role</li>
                <li>Tailor your résumé for one role with AI</li>
              </ul>
              <Link to="/upload" className="lp-tier-cta">
                Upload your résumé — free
              </Link>
            </div>

            {/* Pro */}
            <div className="lp-tier lp-tier-pro">
              <div className="lp-tier-tag">Most seekers</div>
              <div className="lp-tier-name">Pro</div>
              <div className="lp-tier-price">
                $15<span className="lp-tier-per">/mo · cancel anytime</span>
              </div>
              <p className="lp-tier-desc">
                For when you&rsquo;re actively interviewing. Everything in Free, plus:
              </p>
              <ul className="lp-tier-feats">
                <li>Unlimited AI résumé tailoring — re-done for each role</li>
                <li>
                  Interview cheat sheets for every interview — company intel, likely
                  questions, ready answers
                </li>
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
        </section>

        {/* Final CTA */}
        <div className="lp-final">
          <div className="lp-final-head">
            APPLY TO LESS GHOST JOBS.
            <br />
            TO LAND&nbsp;<span className="lp-red">THE RIGHT ONE.</span>
          </div>
          <p className="lp-final-sub">
            Real matches, honest fit, and a cheat sheet for the interview — all
            free.
          </p>
          <Link to="/upload" className="lp-pill lp-pill-lg">
            Upload your résumé — free
          </Link>
          <Link to="/builder" className="lp-alt-cta lp-alt-cta-center">
            No résumé yet? Build one free →
          </Link>
          <div className="lp-final-note">
            Free for job seekers. No credit card. No catch.
          </div>
        </div>

        {/* Footer */}
        <div className="lp-footer">
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
      </div>

      {adhdOpen && <AdhdPanel onClose={() => setAdhdOpen(false)} />}
    </div>
  )
}
