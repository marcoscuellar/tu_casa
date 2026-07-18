import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow, SEARCH_GATE } from '../../flow/AppFlowContext'
import { inferFamily, inferLevel } from '../../engines/taxonomy'
import { toCanonical } from '../../engines/synonymMap'
import type { ParsedResume, ResumeSkill } from '../../engines/types'
import './flow.css'
import './ConfirmInfo.css'

const NOW_YEAR = new Date().getFullYear()

/**
 * "Confirm your info" — the review step between parsing and searching.
 *
 * Shows what the parser read from the résumé, pre-filled and editable. A field
 * that came back empty (e.g. no title) is just a blank to fill, not a dead end.
 * Whatever the candidate confirms still runs through the deterministic engine
 * (family/level re-derived from the title), so an edit can't smuggle in garbage.
 */
export function ConfirmInfo() {
  const navigate = useNavigate()
  const { draftResume, confirmResume, wouldBeNewSearch, hasAccount, requireAccount, loading, pipelineError } =
    useAppFlow()

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [onsiteOk, setOnsiteOk] = useState(false)
  const [years, setYears] = useState('')
  const [titleErr, setTitleErr] = useState('')
  const [skillsList, setSkillsList] = useState<ResumeSkill[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [industriesList, setIndustriesList] = useState<string[]>([])
  const [newIndustry, setNewIndustry] = useState('')
  // Default to a clean read-only review; open editing automatically if a
  // required field (the title) came back empty so it can't be missed.
  const [editing, setEditing] = useState(false)

  // Reached without a parsed draft (e.g. a refresh) → back to upload.
  useEffect(() => {
    if (!draftResume) {
      navigate('/upload', { replace: true })
      return
    }
    const t = draftResume.titles[0]?.raw ?? ''
    setTitle(t)
    setLocation(draftResume.location ?? '')
    setOnsiteOk(draftResume.onsite_ok)
    setYears(draftResume.years_total ? String(draftResume.years_total) : '')
    setSkillsList(draftResume.skills)
    setIndustriesList(draftResume.industries)
    setEditing(!t.trim())
  }, [draftResume, navigate])

  if (!draftResume) return null

  const addSkill = () => {
    const canonical = toCanonical(newSkill.trim())
    if (!canonical) return
    if (!skillsList.some((s) => s.canonical === canonical)) {
      setSkillsList((list) => [...list, { canonical, years: 0, last_used_year: NOW_YEAR }])
    }
    setNewSkill('')
  }
  const removeSkill = (canonical: string) =>
    setSkillsList((list) => list.filter((s) => s.canonical !== canonical))

  const addIndustry = () => {
    const v = newIndustry.trim()
    if (!v) return
    // Free text (the ranking engine canonicalizes these); dedupe case-insensitively.
    if (!industriesList.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setIndustriesList((list) => [...list, v])
    }
    setNewIndustry('')
  }
  const removeIndustry = (value: string) =>
    setIndustriesList((list) => list.filter((i) => i !== value))

  const submit = async () => {
    const t = title.trim()
    if (!t) {
      setTitleErr('Add your role so we can match jobs to it.')
      setEditing(true)
      return
    }
    setTitleErr('')
    const yrs = Number(years)
    const confirmed: ParsedResume = {
      // family/level are re-derived from the (possibly edited) title.
      titles: [{ raw: t, family: inferFamily(t), level: inferLevel(t) }],
      skills: skillsList, // parsed + user-edited, canonicalized
      years_total: Number.isFinite(yrs) ? Math.min(60, Math.max(0, Math.round(yrs))) : 0,
      industries: industriesList,
      certs_clearances: draftResume.certs_clearances,
      location: location.trim(),
      onsite_ok: onsiteOk,
    }
    const runSearch = async () => {
      const ok = await confirmResume(confirmed)
      if (ok) navigate('/discovery')
    }
    // First shortlist is free. A different, second search asks for a quick
    // profile — closes the "refresh for endless new jobs" loophole. The same
    // résumé returns its cached list, so re-confirming it never gates.
    if (!hasAccount && wouldBeNewSearch(confirmed)) {
      requireAccount(() => void runSearch(), SEARCH_GATE)
    } else {
      void runSearch()
    }
  }

  return (
    <AppShell>
      <div className="confirm-bento pop">
        <div className="blk blk-black confirm-block">
        <div className="confirm-header">
          <div className="eyebrow">Confirm your info</div>
          <div className="upload-step mono-label">Setup · 2 of 2</div>
        </div>

        <div className="confirm-intro">
          <h1 className="head confirm-head">
            Quick check <span className="red">before we search.</span>
          </h1>
          <p className="confirm-sub">
            Here&rsquo;s what we read from your résumé. Fix anything that&rsquo;s
            off — this is exactly what we match jobs against.
          </p>
        </div>

        <div className="confirm-editbar">
          <span className="confirm-editbar-note mono-label">
            {editing ? 'Editing — tap Done when finished' : 'Pulled from your résumé'}
          </span>
          <button
            type="button"
            className={`confirm-edit-btn ${editing ? 'is-editing' : ''}`}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? '✓ Done' : '✎ Edit'}
          </button>
        </div>

        <div className="confirm-fields">
          <div className="confirm-field confirm-field-hero">
            <span className="confirm-flabel mono-label">Your title / role</span>
            {editing ? (
              <>
                <input
                  className="confirm-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                />
                {titleErr && <span className="confirm-ferr">{titleErr}</span>}
              </>
            ) : (
              <span className={`confirm-value ${!title.trim() ? 'is-missing' : ''}`}>
                {title.trim() || 'Not detected — tap Edit to add it'}
              </span>
            )}
          </div>

          <div className="confirm-row">
            <div className="confirm-field">
              <span className="confirm-flabel mono-label">Location</span>
              {editing ? (
                <input
                  className="confirm-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote (US) or Austin, TX"
                />
              ) : (
                <span className="confirm-value">{location.trim() || 'Not specified'}</span>
              )}
            </div>
            <div className="confirm-field confirm-field-sm">
              <span className="confirm-flabel mono-label">Years of experience</span>
              {editing ? (
                <input
                  className="confirm-input"
                  type="number"
                  min={0}
                  max={60}
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="0"
                />
              ) : (
                <span className="confirm-value">{years ? `${years} yrs` : '—'}</span>
              )}
            </div>
          </div>

          <div className="confirm-field">
            <span className="confirm-flabel mono-label">Work preference</span>
            {editing ? (
              <div className="confirm-toggle">
                <button
                  type="button"
                  className={`confirm-toggle-btn ${!onsiteOk ? 'is-on' : ''}`}
                  onClick={() => setOnsiteOk(false)}
                >
                  Remote only
                </button>
                <button
                  type="button"
                  className={`confirm-toggle-btn ${onsiteOk ? 'is-on' : ''}`}
                  onClick={() => setOnsiteOk(true)}
                >
                  Open to onsite
                </button>
              </div>
            ) : (
              <span className={`confirm-pill ${onsiteOk ? 'is-onsite' : ''}`}>
                {onsiteOk ? 'Open to onsite' : 'Remote only'}
              </span>
            )}
          </div>

          <div className="confirm-field">
            <span className="confirm-flabel mono-label">
              Skills we found <span className="confirm-count">{skillsList.length}</span>
            </span>
            {skillsList.length > 0 ? (
              <div className="confirm-chips">
                {skillsList.map((s) => (
                  <span
                    key={s.canonical}
                    className={`confirm-chip ${editing ? 'is-editable' : ''}`}
                  >
                    {s.canonical}
                    {editing && (
                      <button
                        type="button"
                        className="confirm-chip-x"
                        onClick={() => removeSkill(s.canonical)}
                        aria-label={`Remove ${s.canonical}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="confirm-chip-empty">
                {editing
                  ? 'None yet — add your key skills below.'
                  : 'None detected — tap Edit to add your skills.'}
              </span>
            )}
            {editing && (
              <div className="confirm-add-skill">
                <input
                  className="confirm-input confirm-add-input"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                  placeholder="Add a skill, press Enter"
                />
                <button type="button" className="confirm-add-btn" onClick={addSkill}>
                  + Add
                </button>
              </div>
            )}
          </div>

          <div className="confirm-field">
            <span className="confirm-flabel mono-label">
              Industry / field <span className="confirm-count">{industriesList.length}</span>
            </span>
            <span className="confirm-field-hint">
              Steer what surfaces — add fields you&rsquo;d move into, remove ones
              you&rsquo;re done with.
            </span>
            {industriesList.length > 0 ? (
              <div className="confirm-chips">
                {industriesList.map((ind) => (
                  <span
                    key={ind}
                    className={`confirm-chip ${editing ? 'is-editable' : ''}`}
                  >
                    {ind}
                    {editing && (
                      <button
                        type="button"
                        className="confirm-chip-x"
                        onClick={() => removeIndustry(ind)}
                        aria-label={`Remove ${ind}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="confirm-chip-empty">
                {editing
                  ? 'None yet — add the industries you’ve worked in.'
                  : 'None detected — tap Edit to add your industry.'}
              </span>
            )}
            {editing && (
              <div className="confirm-add-skill">
                <input
                  className="confirm-input confirm-add-input"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addIndustry()
                    }
                  }}
                  placeholder="e.g. Fintech, Healthcare, E-commerce"
                />
                <button type="button" className="confirm-add-btn" onClick={addIndustry}>
                  + Add
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="confirm-actions">
          <button className="confirm-submit" onClick={submit} disabled={loading}>
            {loading ? 'Finding your matches…' : 'Looks good — find my jobs →'}
          </button>
          <button className="confirm-back" onClick={() => navigate('/upload')} disabled={loading}>
            Start over
          </button>
        </div>
        {pipelineError && <p className="confirm-error">{pipelineError}</p>}
        </div>

        <aside className="confirm-aside">
          <div className="confirm-aside-title mono-label">How it works</div>
          <ol className="confirm-steps">
            <li className="confirm-step is-done">
              <span className="confirm-step-n mono-label">01</span>
              <span className="confirm-step-t">Résumé read</span>
              <span className="confirm-step-tick">✓</span>
            </li>
            <li className="confirm-step is-now">
              <span className="confirm-step-n mono-label">02</span>
              <span className="confirm-step-t">Confirm your details</span>
            </li>
            <li className="confirm-step">
              <span className="confirm-step-n mono-label">03</span>
              <span className="confirm-step-t">Your top 7 matches</span>
            </li>
          </ol>
          <p className="confirm-aside-note">
            We match jobs against <b>exactly this</b> — so a minute here sharpens
            every result. Private to you; nothing is shared.
          </p>
          <div className="confirm-aside-callout">
            <span className="confirm-callout-label mono-label">Up next</span>
            <span className="confirm-callout-val">Your top 7 →</span>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
