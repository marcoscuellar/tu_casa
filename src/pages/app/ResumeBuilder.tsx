import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import {
  emptyEducation,
  emptyExperience,
  loadDoc,
  saveDoc,
  seedDoc,
  type ResumeDoc,
  type ResumeEducation,
  type ResumeExperience,
} from '../../lib/resumeDoc'
import './flow.css'
import './ResumeBuilder.css'

/**
 * Résumé builder — Phase 1: a from-scratch, one-page résumé.
 *
 * A structured editor on the left, a live paper preview on the right. Everything
 * is a pure render of the ResumeDoc; "Download PDF" just prints that preview.
 * The draft autosaves to localStorage. Phase 2 will layer tailor-to-a-role on
 * top of the same document model.
 */
export function ResumeBuilder() {
  const navigate = useNavigate()
  const { name, email, resume } = useAppFlow()

  const [doc, setDoc] = useState<ResumeDoc>(() => loadDoc() ?? seedDoc({ resume, name, email }))
  const [newSkill, setNewSkill] = useState('')

  // Autosave the draft as it changes.
  useEffect(() => {
    saveDoc(doc)
  }, [doc])

  /* ---- field helpers ---- */
  const set = <K extends keyof ResumeDoc>(key: K, value: ResumeDoc[K]) =>
    setDoc((d) => ({ ...d, [key]: value }))

  const setExp = (id: string, patch: Partial<ResumeExperience>) =>
    setDoc((d) => ({
      ...d,
      experience: d.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  const addExp = () => setDoc((d) => ({ ...d, experience: [...d.experience, emptyExperience()] }))
  const removeExp = (id: string) =>
    setDoc((d) => ({ ...d, experience: d.experience.filter((e) => e.id !== id) }))
  const setBullet = (id: string, i: number, value: string) =>
    setExp(id, {
      bullets: doc.experience.find((e) => e.id === id)!.bullets.map((b, bi) => (bi === i ? value : b)),
    })
  const addBullet = (id: string) =>
    setExp(id, { bullets: [...doc.experience.find((e) => e.id === id)!.bullets, ''] })
  const removeBullet = (id: string, i: number) =>
    setExp(id, {
      bullets: doc.experience.find((e) => e.id === id)!.bullets.filter((_, bi) => bi !== i),
    })

  const setEdu = (id: string, patch: Partial<ResumeEducation>) =>
    setDoc((d) => ({
      ...d,
      education: d.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  const addEdu = () => setDoc((d) => ({ ...d, education: [...d.education, emptyEducation()] }))
  const removeEdu = (id: string) =>
    setDoc((d) => ({ ...d, education: d.education.filter((e) => e.id !== id) }))

  const addSkill = () => {
    const v = newSkill.trim()
    if (v && !doc.skills.some((s) => s.toLowerCase() === v.toLowerCase())) {
      set('skills', [...doc.skills, v])
    }
    setNewSkill('')
  }
  const removeSkill = (s: string) => set('skills', doc.skills.filter((x) => x !== s))

  const contactLine = [doc.email, doc.phone, doc.location, doc.links].filter(Boolean).join('  ·  ')

  return (
    <AppShell>
      <div className="rb-bento pop">
        {/* Editor */}
        <div className="blk blk-black rb-editor">
          <div className="rb-head-row">
            <div>
              <div className="eyebrow">Résumé builder</div>
              <h1 className="head rb-head">
                Build your <span className="red">one-pager.</span>
              </h1>
            </div>
            <button className="rb-print-btn" onClick={() => window.print()}>
              ↓ Download PDF
            </button>
          </div>
          <p className="rb-sub">
            Fill it in on the left; the page on the right updates live. Autosaves
            as you go.
          </p>

          {/* Identity */}
          <div className="rb-section">
            <div className="rb-slabel mono-label">The basics</div>
            <input
              className="rb-input"
              placeholder="Full name"
              value={doc.name}
              onChange={(e) => set('name', e.target.value)}
            />
            <input
              className="rb-input"
              placeholder="Headline — e.g. Senior Frontend Engineer"
              value={doc.headline}
              onChange={(e) => set('headline', e.target.value)}
            />
            <div className="rb-row">
              <input
                className="rb-input"
                placeholder="Email"
                value={doc.email}
                onChange={(e) => set('email', e.target.value)}
              />
              <input
                className="rb-input"
                placeholder="Phone"
                value={doc.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="rb-row">
              <input
                className="rb-input"
                placeholder="Location — e.g. Austin, TX"
                value={doc.location}
                onChange={(e) => set('location', e.target.value)}
              />
              <input
                className="rb-input"
                placeholder="Links — linkedin.com/in/… · site.com"
                value={doc.links}
                onChange={(e) => set('links', e.target.value)}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rb-section">
            <div className="rb-slabel mono-label">Summary</div>
            <textarea
              className="rb-input rb-textarea"
              placeholder="Two or three lines on who you are and what you do best. Optional."
              rows={3}
              value={doc.summary}
              onChange={(e) => set('summary', e.target.value)}
            />
          </div>

          {/* Experience */}
          <div className="rb-section">
            <div className="rb-slabel mono-label">Experience</div>
            {doc.experience.map((exp) => (
              <div key={exp.id} className="rb-entry">
                <div className="rb-entry-head">
                  <input
                    className="rb-input"
                    placeholder="Title — e.g. Senior Frontend Engineer"
                    value={exp.title}
                    onChange={(e) => setExp(exp.id, { title: e.target.value })}
                  />
                  {doc.experience.length > 1 && (
                    <button
                      className="rb-remove"
                      onClick={() => removeExp(exp.id)}
                      aria-label="Remove role"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="rb-row">
                  <input
                    className="rb-input"
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => setExp(exp.id, { company: e.target.value })}
                  />
                  <input
                    className="rb-input"
                    placeholder="Location"
                    value={exp.location}
                    onChange={(e) => setExp(exp.id, { location: e.target.value })}
                  />
                </div>
                <div className="rb-row">
                  <input
                    className="rb-input"
                    placeholder="Start — e.g. 2021"
                    value={exp.start}
                    onChange={(e) => setExp(exp.id, { start: e.target.value })}
                  />
                  <input
                    className="rb-input"
                    placeholder="End — e.g. Present"
                    value={exp.end}
                    onChange={(e) => setExp(exp.id, { end: e.target.value })}
                  />
                </div>
                <div className="rb-bullets">
                  {exp.bullets.map((b, i) => (
                    <div key={i} className="rb-bullet-row">
                      <span className="rb-bullet-dot">•</span>
                      <input
                        className="rb-input"
                        placeholder="What you did / the impact — start with a verb"
                        value={b}
                        onChange={(e) => setBullet(exp.id, i, e.target.value)}
                      />
                      {exp.bullets.length > 1 && (
                        <button
                          className="rb-remove"
                          onClick={() => removeBullet(exp.id, i)}
                          aria-label="Remove bullet"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="rb-add-inline" onClick={() => addBullet(exp.id)}>
                    + Add a bullet
                  </button>
                </div>
              </div>
            ))}
            <button className="rb-add" onClick={addExp}>
              + Add a role
            </button>
          </div>

          {/* Skills */}
          <div className="rb-section">
            <div className="rb-slabel mono-label">Skills</div>
            {doc.skills.length > 0 && (
              <div className="rb-chips">
                {doc.skills.map((s) => (
                  <span key={s} className="rb-chip">
                    {s}
                    <button
                      className="rb-chip-x"
                      onClick={() => removeSkill(s)}
                      aria-label={`Remove ${s}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="rb-add-skill">
              <input
                className="rb-input"
                placeholder="Add a skill, press Enter"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkill()
                  }
                }}
              />
              <button className="rb-add-btn" onClick={addSkill}>
                + Add
              </button>
            </div>
          </div>

          {/* Education */}
          <div className="rb-section">
            <div className="rb-slabel mono-label">Education</div>
            {doc.education.map((edu) => (
              <div key={edu.id} className="rb-entry">
                <div className="rb-entry-head">
                  <input
                    className="rb-input"
                    placeholder="School"
                    value={edu.school}
                    onChange={(e) => setEdu(edu.id, { school: e.target.value })}
                  />
                  {doc.education.length > 1 && (
                    <button
                      className="rb-remove"
                      onClick={() => removeEdu(edu.id)}
                      aria-label="Remove education"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="rb-row">
                  <input
                    className="rb-input"
                    placeholder="Degree — e.g. B.S. Computer Science"
                    value={edu.degree}
                    onChange={(e) => setEdu(edu.id, { degree: e.target.value })}
                  />
                  <input
                    className="rb-input"
                    placeholder="Year"
                    value={edu.year}
                    onChange={(e) => setEdu(edu.id, { year: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <button className="rb-add" onClick={addEdu}>
              + Add education
            </button>
          </div>

          <div className="rb-actions">
            <button className="rb-print-btn rb-print-lg" onClick={() => window.print()}>
              ↓ Download PDF
            </button>
            <button className="rb-back" onClick={() => navigate('/upload')}>
              Back to upload
            </button>
          </div>
        </div>

        {/* Live preview — the printed page */}
        <div className="rb-preview-wrap">
          <div className="rb-paper">
            <header className="rb-p-head">
              <h2 className="rb-p-name">{doc.name || 'Your Name'}</h2>
              {doc.headline && <div className="rb-p-headline">{doc.headline}</div>}
              {contactLine && <div className="rb-p-contact">{contactLine}</div>}
            </header>

            {doc.summary && (
              <section className="rb-p-sec">
                <div className="rb-p-sectitle">Summary</div>
                <p className="rb-p-summary">{doc.summary}</p>
              </section>
            )}

            {doc.experience.some((e) => e.title || e.company) && (
              <section className="rb-p-sec">
                <div className="rb-p-sectitle">Experience</div>
                {doc.experience
                  .filter((e) => e.title || e.company)
                  .map((e) => (
                    <div key={e.id} className="rb-p-entry">
                      <div className="rb-p-entry-top">
                        <span className="rb-p-role">{e.title || 'Role'}</span>
                        <span className="rb-p-dates">
                          {[e.start, e.end].filter(Boolean).join(' – ')}
                        </span>
                      </div>
                      <div className="rb-p-org">
                        {[e.company, e.location].filter(Boolean).join(' · ')}
                      </div>
                      <ul className="rb-p-bullets">
                        {e.bullets
                          .filter(Boolean)
                          .map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </section>
            )}

            {doc.skills.length > 0 && (
              <section className="rb-p-sec">
                <div className="rb-p-sectitle">Skills</div>
                <div className="rb-p-skills">{doc.skills.join('  ·  ')}</div>
              </section>
            )}

            {doc.education.some((e) => e.school || e.degree) && (
              <section className="rb-p-sec">
                <div className="rb-p-sectitle">Education</div>
                {doc.education
                  .filter((e) => e.school || e.degree)
                  .map((e) => (
                    <div key={e.id} className="rb-p-entry">
                      <div className="rb-p-entry-top">
                        <span className="rb-p-role">{e.school || 'School'}</span>
                        <span className="rb-p-dates">{e.year}</span>
                      </div>
                      <div className="rb-p-org">{e.degree}</div>
                    </div>
                  ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
