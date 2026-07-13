import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useClock } from '../lib/useClock'
import { AdhdPanel } from '../components/AdhdPanel'
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

  return (
    <div className="lp">
      <div className="lp-wrap">
        {/* Topbar */}
        <div className="lp-topbar">
          <div className="lp-topbar-left">
            <div className="lp-brand">
              <div className="lp-brand-square" />
              TUCASA
            </div>
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
            TuCasa
          </div>
          {/* Solid red rail with a down + up arrow pair (white). */}
          <div className="lp-hero-rail" aria-hidden>
            <div className="lp-hero-arrows">
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
            should be this&nbsp;<span className="lp-red">easy.</span>
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
                  className="lp-acc"
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

        {/* Final CTA */}
        <div className="lp-final" id="pricing">
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
          <div className="lp-final-note">
            Free for job seekers. No credit card. No catch.
          </div>
        </div>

        {/* Footer */}
        <div className="lp-footer">
          <span>tucasa</span>
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
