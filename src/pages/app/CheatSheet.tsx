import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import { CHEAT_NAV, PREFLIGHT } from '../../flow/data'
import './flow.css'
import './CheatSheet.css'

export function CheatSheet() {
  const navigate = useNavigate()
  const { cheatCompany, cheatRole, needsCredits, consumeSheet } = useAppFlow()
  const [active, setActive] = useState('company')
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // While an explicit jump is settling, the click wins over the scroll-spy —
  // otherwise a short trailing section (e.g. pre-flight) can't reach the top of
  // the panel and the observer would re-mark the previous section active.
  const jumpingUntil = useRef(0)

  // Section jump: smooth-scroll the content panel to the chosen section.
  const jumpTo = (id: string) => {
    setActive(id)
    jumpingUntil.current = Date.now() + 800
    const el = sectionRefs.current[id]
    const c = scrollRef.current
    if (!el || !c) return
    const top =
      el.getBoundingClientRect().top -
      c.getBoundingClientRect().top +
      c.scrollTop -
      18
    c.scrollTo({ top, behavior: 'smooth' })
  }

  // Scroll-spy: update the active nav item as the user scrolls the panel.
  useEffect(() => {
    const c = scrollRef.current
    if (!c) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < jumpingUntil.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          const id = visible[0].target.getAttribute('data-sec')
          if (id) setActive(id)
        }
      },
      { root: c, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const tryNewSheet = () => {
    if (needsCredits()) {
      navigate('/paywall')
      return
    }
    consumeSheet()
    navigate('/cheat-generating')
  }

  const toggleCheck = (i: number) =>
    setChecked((c) => ({ ...c, [i]: !c[i] }))

  const setSectionRef = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el
  }

  return (
    <AppShell>
      <div className="cheat-grid pop">
        {/* Side nav */}
        <div className="blk blk-black cheat-nav">
          <div className="eyebrow cheat-nav-eyebrow">Interview cheat sheet</div>
          <div className="cheat-nav-role">{cheatRole}</div>
          <div className="cheat-nav-company mono-label">{cheatCompany}</div>
          <div className="cheat-divider" />
          <div className="cheat-nav-list">
            {CHEAT_NAV.map((n) => (
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
          <div className="cheat-nav-hint mono-label">
            Keep this open during the call. Tap any section to jump.
          </div>
          <button className="cheat-new-btn" onClick={tryNewSheet}>
            + New cheat sheet
          </button>
        </div>

        {/* Content */}
        <div className="blk-white cheat-content" ref={scrollRef}>
          {/* 01 Company snapshot */}
          <div data-sec="company" ref={setSectionRef('company')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">01 · Company snapshot</div>
            <h2 className="cheat-sec-head">
              Who you&rsquo;re
              <br />
              walking in to.
            </h2>
            <p className="cheat-para">
              Northwind Apparel is a mid-market DTC retailer (~450 people, Series
              C) pushing hard into direct e-commerce after years of wholesale.
              Their web team owns the storefront, checkout, and a new mobile app
              launching this quarter.
            </p>
            <div className="cheat-tiles">
              <div className="cheat-tile">
                <div className="cheat-tile-label mono-label">Stage</div>
                <div className="cheat-tile-val">Series C · scaling</div>
              </div>
              <div className="cheat-tile">
                <div className="cheat-tile-label mono-label">Signal</div>
                <div className="cheat-tile-val">DTC app launch</div>
              </div>
              <div className="cheat-tile">
                <div className="cheat-tile-label mono-label">Your edge</div>
                <div className="cheat-tile-val">DTC replatforms</div>
              </div>
            </div>
          </div>

          <div className="cheat-hairline" />

          {/* 02 Talking points */}
          <div data-sec="talking" ref={setSectionRef('talking')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">02 · Talking points</div>
            <h2 className="cheat-sec-head">Lead with these.</h2>
            <div className="cheat-talk-list">
              <div className="cheat-talk">
                <div className="cheat-talk-title">
                  You&rsquo;ve shipped the exact thing they&rsquo;re building.
                </div>
                <p className="cheat-talk-body">
                  Your Shopify Hydrogen storefront replatform at Loomly maps
                  directly to their DTC push. Bring the load-time and conversion
                  numbers.
                </p>
              </div>
              <div className="cheat-talk">
                <div className="cheat-talk-title">
                  You bridge design and engineering.
                </div>
                <p className="cheat-talk-body">
                  Seven years pairing with design systems teams — useful for a
                  small web team that can&rsquo;t silo roles.
                </p>
              </div>
              <div className="cheat-talk">
                <div className="cheat-talk-title">
                  You&rsquo;ve done the mobile-web handoff.
                </div>
                <p className="cheat-talk-body">
                  Their app is launching now — your React Native side project is
                  a credible, honest anchor.
                </p>
              </div>
            </div>
          </div>

          <div className="cheat-hairline" />

          {/* 03 Likely questions */}
          <div data-sec="questions" ref={setSectionRef('questions')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">03 · Likely questions</div>
            <h2 className="cheat-sec-head">
              What they&rsquo;ll ask —
              <br />
              and your answer.
            </h2>
            <div className="cheat-qa-list">
              <div className="cheat-qa">
                <div className="cheat-qa-q">
                  &ldquo;Walk me through a replatform you led.&rdquo;
                </div>
                <p className="cheat-qa-a">
                  <b className="cheat-you">You:</b> Loomly, 2023 — migrated a
                  legacy storefront to Hydrogen. Frame it as problem → your call
                  → measured result (LCP 4.1s → 1.6s, +12% mobile conversion).
                </p>
              </div>
              <div className="cheat-qa">
                <div className="cheat-qa-q">
                  &ldquo;How do you work with designers?&rdquo;
                </div>
                <p className="cheat-qa-a">
                  <b className="cheat-you">You:</b> Tokens and a shared component
                  library. Give the concrete example of the design-system
                  rebuild you co-owned.
                </p>
              </div>
              <div className="cheat-qa">
                <div className="cheat-qa-q">
                  &ldquo;Where are you weaker?&rdquo;
                </div>
                <p className="cheat-qa-a">
                  <b className="cheat-you">You:</b> Native mobile depth. Be
                  honest, then pivot to your RN side project and how fast you
                  ramp.
                </p>
              </div>
            </div>
          </div>

          <div className="cheat-hairline" />

          {/* 04 Questions to ask */}
          <div data-sec="askback" ref={setSectionRef('askback')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">04 · Ask them back</div>
            <h2 className="cheat-sec-head">
              Turn it into
              <br />
              a conversation.
            </h2>
            <ul className="cheat-ask-list">
              <li className="cheat-ask">
                <span className="cheat-arrow">→</span> How&rsquo;s the web team
                split between the storefront and the new app?
              </li>
              <li className="cheat-ask">
                <span className="cheat-arrow">→</span> What does &ldquo;done&rdquo;
                look like for the app launch this quarter?
              </li>
              <li className="cheat-ask">
                <span className="cheat-arrow">→</span> Where does the current
                storefront hurt most on performance?
              </li>
              <li className="cheat-ask">
                <span className="cheat-arrow">→</span> Who would I pair with most
                in the first 90 days?
              </li>
            </ul>
          </div>

          <div className="cheat-hairline" />

          {/* 05 Posture */}
          <div data-sec="posture" ref={setSectionRef('posture')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">05 · Posture</div>
            <div className="cheat-posture">
              <div className="cheat-posture-title">
                You&rsquo;re not being judged. You&rsquo;re both figuring out if
                this fits.
              </div>
              <p className="cheat-posture-body">
                You&rsquo;ve already done the work — this résumé earned the room.
                Slow down, answer the question they asked, and it&rsquo;s fine to
                take two seconds before you speak. You&rsquo;ve got this.
              </p>
            </div>
          </div>

          <div className="cheat-hairline" />

          {/* 06 Pre-flight */}
          <div
            data-sec="preflight"
            ref={setSectionRef('preflight')}
            className="cheat-sec cheat-sec-last"
          >
            <div className="cheat-sec-eyebrow mono-label">06 · Pre-flight</div>
            <h2 className="cheat-sec-head">
              Right before
              <br />
              the call.
            </h2>
            <div className="cheat-preflight">
              {PREFLIGHT.map((label, i) => {
                const on = !!checked[i]
                return (
                  <label
                    key={label}
                    className="cheat-pf-row"
                    onClick={() => toggleCheck(i)}
                  >
                    <span className={`cheat-pf-box ${on ? 'is-on' : ''}`}>
                      {on ? '✓' : ''}
                    </span>
                    <span className={`cheat-pf-label ${on ? 'is-on' : ''}`}>
                      {label}
                    </span>
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
