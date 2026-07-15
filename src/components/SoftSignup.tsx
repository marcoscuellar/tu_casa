import { useState } from 'react'
import { useAppFlow } from '../flow/AppFlowContext'
import './SoftSignup.css'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Soft-signup modal — the deferred/on-gate account step. Rendered once inside
 * the app shell; it shows only when a gated action opened the gate
 * (`accountGate`). Name + email is all it asks — no password, no wall.
 */
export function SoftSignup() {
  const { accountGate, submitAccountGate, cancelAccountGate, candidateName, email } = useAppFlow()
  const [name, setName] = useState(candidateName === 'there' ? '' : candidateName)
  const [mail, setMail] = useState(email)
  const [err, setErr] = useState('')

  if (!accountGate) return null

  const submit = () => {
    if (!name.trim()) return setErr('Add your name to continue.')
    if (!EMAIL_RE.test(mail.trim())) return setErr('Enter a valid email.')
    setErr('')
    submitAccountGate(name.trim(), mail.trim())
  }

  return (
    <div className="ss-backdrop" onClick={cancelAccountGate}>
      <div
        className="ss-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Create a quick profile"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="ss-close" onClick={cancelAccountGate} aria-label="Close">
          ×
        </button>
        <div className="ss-eyebrow mono-label">Quick profile · 10 seconds</div>
        <h2 className="ss-title">{accountGate.title}</h2>
        {accountGate.sub && <p className="ss-sub">{accountGate.sub}</p>}

        <label className="ss-field">
          <span className="ss-flabel mono-label">Name</span>
          <input
            className="ss-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
        </label>
        <label className="ss-field">
          <span className="ss-flabel mono-label">Email</span>
          <input
            className="ss-input"
            type="email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder="you@email.com"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        {err && <div className="ss-err">{err}</div>}

        <button className="ss-submit" onClick={submit}>
          Save &amp; continue →
        </button>
        <div className="ss-fine">Free forever for job seekers. No card, no spam.</div>
      </div>
    </div>
  )
}
