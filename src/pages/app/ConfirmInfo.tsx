import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import { inferFamily, inferLevel } from '../../engines/taxonomy'
import type { ParsedResume } from '../../engines/types'
import './flow.css'
import './ConfirmInfo.css'

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
  const { draftResume, confirmResume, loading, pipelineError } = useAppFlow()

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [onsiteOk, setOnsiteOk] = useState(false)
  const [years, setYears] = useState('')
  const [titleErr, setTitleErr] = useState('')
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
    setEditing(!t.trim())
  }, [draftResume, navigate])

  if (!draftResume) return null
  const skills = draftResume.skills

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
      skills, // as parsed — already canonicalized
      years_total: Number.isFinite(yrs) ? Math.min(60, Math.max(0, Math.round(yrs))) : 0,
      industries: draftResume.industries,
      certs_clearances: draftResume.certs_clearances,
      location: location.trim(),
      onsite_ok: onsiteOk,
    }
    const ok = await confirmResume(confirmed)
    if (ok) navigate('/discovery')
  }

  return (
    <AppShell>
      <div className="blk blk-black confirm-block pop">
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
          <button
            type="button"
            className="confirm-edit-btn"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Done' : '✎ Edit'}
          </button>
        </div>

        <div className="confirm-fields">
          <div className="confirm-field">
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
              <span className="confirm-value">
                {onsiteOk ? 'Open to onsite' : 'Remote only'}
              </span>
            )}
          </div>

          <div className="confirm-field">
            <span className="confirm-flabel mono-label">
              Skills we found · {skills.length}
            </span>
            {skills.length > 0 ? (
              <div className="confirm-chips">
                {skills.map((s) => (
                  <span key={s.canonical} className="confirm-chip">
                    {s.canonical}
                  </span>
                ))}
              </div>
            ) : (
              <span className="confirm-chip-empty">
                None detected — we&rsquo;ll still match on your title.
              </span>
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
    </AppShell>
  )
}
