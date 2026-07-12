import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import { CHEAT_NAV, PREFLIGHT } from '../../flow/data'
import './flow.css'
import './CheatSheet.css'

const GENERIC_ASKS = [
  'How will you know the person in this role is succeeding in the first 90 days?',
  'What does the team most need help with right now?',
  'How does the team make decisions when priorities conflict?',
]

export function CheatSheet() {
  const navigate = useNavigate()
  const {
    selectedJob,
    research,
    insight,
    needsCredits,
    consumeSheet,
  } = useAppFlow()
  const [active, setActive] = useState('company')
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const jumpingUntil = useRef(0)

  // Reached without a selection/research → back to the shortlist.
  useEffect(() => {
    if (!selectedJob) navigate('/discovery', { replace: true })
  }, [selectedJob, navigate])

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
  }, [selectedJob])

  if (!selectedJob || !research) return null

  const brief = research.brief
  const thin = research.readiness === 'THIN'

  const tryNewSheet = () => {
    if (needsCredits()) {
      navigate('/paywall')
      return
    }
    consumeSheet()
    navigate('/cheat-generating')
  }

  const toggleCheck = (i: number) => setChecked((c) => ({ ...c, [i]: !c[i] }))
  const setSectionRef = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el
  }

  // Section 01 tiles — only from confirmable facts.
  const tiles: { label: string; val: string }[] = []
  if (brief.stageSize) tiles.push({ label: 'Stage', val: brief.stageSize })
  if (brief.signals[0]) tiles.push({ label: 'Signal', val: brief.signals[0].signal })
  if (brief.mainProduct) tiles.push({ label: 'Focus', val: brief.mainProduct })

  // Section 02/03 are driven by the reasoned "why this role exists" when we have
  // one (real, grounded signals). Otherwise they fall back to role-based prep.
  const hasInsight = !!insight && insight.talkingPoints.length > 0

  const fallbackTalkingPoints =
    brief.statedPriorities.length > 0
      ? brief.statedPriorities.map((p) => ({ title: p.priority, body: p.howToUse }))
      : brief.likelyThemes.map((t) => ({
          title: `Have a story ready: ${t}`,
          body: 'Draw it from your own experience — a concrete example beats a general claim.',
        }))

  // Section 04 — sourced questions to ask, topped up with safe generics.
  const asks = [
    ...brief.signals.map((s) => s.youCouldSay),
    ...GENERIC_ASKS,
  ].slice(0, 4)

  return (
    <AppShell>
      <div className="cheat-grid pop">
        {/* Side nav */}
        <div className="blk blk-black cheat-nav">
          <div className="eyebrow cheat-nav-eyebrow">Interview cheat sheet</div>
          <div className="cheat-nav-role">{selectedJob.role}</div>
          <div className="cheat-nav-company mono-label">{selectedJob.company}</div>
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
          {thin && (
            <div className="cheat-thin">
              Public info on {selectedJob.company} was limited — this sheet leans
              on role-based prep. That&rsquo;s honest and still works.
            </div>
          )}

          {/* 01 Company snapshot */}
          <div data-sec="company" ref={setSectionRef('company')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">01 · Company snapshot</div>
            <h2 className="cheat-sec-head">
              Who you&rsquo;re
              <br />
              walking in to.
            </h2>
            <p className="cheat-para">
              {brief.companyOneLiner}
              {brief.mainProduct ? ` ${brief.mainProduct}` : ''}
            </p>
            {tiles.length > 0 && (
              <div className="cheat-tiles">
                {tiles.map((tile) => (
                  <div key={tile.label} className="cheat-tile">
                    <div className="cheat-tile-label mono-label">{tile.label}</div>
                    <div className="cheat-tile-val">{tile.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cheat-hairline" />

          {/* 02 Talking points — reasoned from why the role exists */}
          <div data-sec="talking" ref={setSectionRef('talking')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">02 · Talking points</div>
            <h2 className="cheat-sec-head">Lead with these.</h2>

            {hasInsight && insight && (
              <div className="cheat-why">
                <div className="cheat-why-label mono-label">Why this role exists</div>
                <div className="cheat-why-text">{insight.why}</div>
              </div>
            )}

            <div className="cheat-talk-list">
              {hasInsight && insight
                ? insight.talkingPoints.map((tp) => (
                    <div key={tp.point} className="cheat-talk">
                      <div className="cheat-talk-title">{tp.point}</div>
                      <p className="cheat-talk-body">{tp.because}</p>
                      <div className="cheat-src mono-label">
                        Based on: {tp.sources.join(' · ')}
                      </div>
                    </div>
                  ))
                : fallbackTalkingPoints.map((tp) => (
                    <div key={tp.title} className="cheat-talk">
                      <div className="cheat-talk-title">{tp.title}</div>
                      <p className="cheat-talk-body">{tp.body}</p>
                    </div>
                  ))}
            </div>
          </div>

          <div className="cheat-hairline" />

          {/* 03 Likely questions — generated FROM the company's situation */}
          <div data-sec="questions" ref={setSectionRef('questions')} className="cheat-sec">
            <div className="cheat-sec-eyebrow mono-label">03 · Likely questions</div>
            {hasInsight && insight && insight.likelyQuestions.length > 0 ? (
              <>
                <h2 className="cheat-sec-head">
                  What they&rsquo;ll dig
                  <br />
                  into — and why.
                </h2>
                <div className="cheat-qa-list">
                  {insight.likelyQuestions.map((q) => (
                    <div key={q.question} className="cheat-qa">
                      <div className="cheat-qa-q">{q.question}</div>
                      <p className="cheat-qa-a">
                        <b className="cheat-you">Why:</b> {q.why}
                      </p>
                      <div className="cheat-src mono-label">
                        Based on: {q.sources.join(' · ')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="cheat-sec-head">
                  What this role
                  <br />
                  tends to draw.
                </h2>
                <div className="cheat-qa-note">
                  Not enough public signal to infer why they&rsquo;re hiring —
                  preparing for the role itself.
                </div>
                <div className="cheat-qa-list">
                  {brief.likelyThemes.map((theme) => (
                    <div key={theme} className="cheat-qa">
                      <div className="cheat-qa-q">
                        Expect questions on {theme.toLowerCase()}.
                      </div>
                      <p className="cheat-qa-a">
                        <b className="cheat-you">Prep:</b> pull your answer from your
                        own background — a specific example lands better than a
                        general claim.
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
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
              {asks.map((q) => (
                <li key={q} className="cheat-ask">
                  <span className="cheat-arrow">→</span> {q}
                </li>
              ))}
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
