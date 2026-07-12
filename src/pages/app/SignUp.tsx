import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { useAppFlow } from '../../flow/AppFlowContext'
import './flow.css'
import './SignUp.css'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function SignUp() {
  const navigate = useNavigate()
  const { setAccount } = useAppFlow()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    if (!name.trim()) return setErr('Add your name to continue.')
    if (!EMAIL_RE.test(email.trim())) return setErr('Enter a valid email.')
    setErr('')
    setAccount(name.trim(), email.trim())
    navigate('/upload')
  }

  return (
    <AppShell>
      <div className="signup-grid pop grid-collapse">
        {/* Left — hero */}
        <div className="blk blk-black signup-hero">
          <div className="eyebrow signup-hero-eyebrow">AI-powered job search</div>
          <div className="signup-ghost" aria-hidden>
            TuCa
          </div>
          <div className="signup-hero-body">
            <h1 className="head signup-hero-head">
              Real jobs.
              <br />
              Real fit.
              <br />
              Right <span className="red">now.</span>
            </h1>
            <p className="signup-hero-sub">
              Upload your résumé once. We find the roles you actually fit, show
              you where you stand, and get you ready for the room. Free to start
              — no card.
            </p>
          </div>
        </div>

        {/* Right — account card */}
        <div className="blk blk-black signup-card">
          <div className="eyebrow signup-card-eyebrow">Create your account</div>
          <h2 className="signup-card-head">
            Let&rsquo;s get
            <br />
            you set up.
          </h2>
          <p className="signup-card-help">
            Two things and you&rsquo;re in. Everything else comes from your
            résumé — no forms.
          </p>
          <div className="signup-fields">
            <div>
              <label className="field-label-dark" htmlFor="su-name">
                Your name
              </label>
              <input
                id="su-name"
                className="field-dark"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maya Chen"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
            <div>
              <label className="field-label-dark" htmlFor="su-email">
                Email
              </label>
              <input
                id="su-email"
                className="field-dark"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
              />
            </div>
            <div className="signup-err">{err}</div>
            <button className="btn btn-red signup-submit" onClick={submit}>
              Continue — it&rsquo;s free
            </button>
          </div>
          <p className="signup-foot">
            Finding jobs and checking fit are always free.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
