import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toast, useToast } from '../../components/Toast'
import { useAppFlow } from '../../flow/AppFlowContext'
import './auth.css'

const ASSETS = [
  'Capacity Map',
  'Talent Map',
  'Blueprint',
  'Cost Analysis',
  'Hiring Signal Map',
  'Role Gap Analysis',
]

export function Onboarding() {
  const navigate = useNavigate()
  const { msg, show } = useToast()
  const { email } = useAppFlow()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [field, setField] = useState('')
  const [intro, setIntro] = useState(
    'I run a team focused on adding engineering capacity without unnecessary overhead.',
  )
  const [cred, setCred] = useState('')
  const [asset, setAsset] = useState(ASSETS[0])
  const [err, setErr] = useState('')

  const next = () => {
    if (step === 1) {
      if (!name.trim()) return setErr('Add your full name.')
      if (!field.trim()) return setErr('Add what you do.')
      setErr('')
      setStep(2)
      return
    }
    if (step === 2) {
      if (!intro.trim())
        return setErr('Add a brief intro so AI can introduce you.')
      setErr('')
      setStep(3)
    }
  }

  const back = () => {
    setErr('')
    setStep((s) => Math.max(1, s - 1))
  }

  const finish = () => {
    setErr('')
    show('You’re set. Let’s go.')
    setTimeout(() => navigate('/account'), 700)
  }

  const dot = (active: boolean) => ({
    background: active ? 'var(--red)' : 'rgba(255,255,255,.14)',
  })

  return (
    <div className="auth-screen">
      <div className="onb-card">
        <div className="onb-dots">
          <span className="onb-dot" style={dot(step >= 1)} />
          <span className="onb-dot" style={dot(step >= 2)} />
          <span className="onb-dot" style={dot(step >= 3)} />
        </div>

        {step === 1 && (
          <div>
            <h2 className="onb-h2">Let&rsquo;s set up your account</h2>
            <p className="onb-p">The basics — so TuCasa knows who you are.</p>
            <div className="onb-field">
              <label className="onb-label">Full name</label>
              <input
                className="onb-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcos Cuellar"
              />
            </div>
            <div className="onb-field">
              <label className="onb-label">Email</label>
              <input
                className="onb-input"
                value={email || 'you@email.com'}
                disabled
              />
            </div>
            <div className="onb-field">
              <label className="onb-label">What you do</label>
              <input
                className="onb-input"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="Role or field"
              />
            </div>
            <div className="auth-err" style={{ minHeight: 16, margin: '6px 0' }}>
              {err}
            </div>
            <div className="onb-actions">
              <button className="onb-primary" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="onb-h2">How AI should introduce you</h2>
            <p className="onb-p">
              TuCasa uses this to open outreach on your behalf — after leading
              with the role or company.
            </p>
            <div className="onb-field">
              <label className="onb-label">Brief intro for outreach</label>
              <textarea
                className="onb-input"
                rows={3}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
              />
            </div>
            <div className="onb-field">
              <label className="onb-label">
                Credibility line <span className="onb-optional">optional</span>
              </label>
              <input
                className="onb-input"
                value={cred}
                onChange={(e) => setCred(e.target.value)}
                placeholder="Ranked top 5% for backend roles at high-growth startups."
              />
            </div>
            <div className="onb-field">
              <label className="onb-label">Default asset</label>
              <select
                className="onb-input"
                style={{ cursor: 'pointer' }}
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
              >
                {ASSETS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-err" style={{ minHeight: 16, margin: '6px 0' }}>
              {err}
            </div>
            <div className="onb-actions">
              <button className="onb-back" onClick={back}>
                Back
              </button>
              <button className="onb-primary" onClick={next}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="onb-h2">Your first 25 are on us</h2>
            <div className="onb-free-center">
              <div className="onb-free-num">25</div>
              <div className="onb-free-label">outreaches free</div>
              <div className="onb-free-body">
                Draft your first <b style={{ fontWeight: 700 }}>25 outreaches free</b>.
                After that, it&rsquo;s <b style={{ fontWeight: 700 }}>$11/month</b>{' '}
                for unlimited AI drafting.
              </div>
              <div className="onb-free-note">No card required to start.</div>
            </div>
            <div className="auth-err" style={{ minHeight: 16, margin: '12px 0 6px' }}>
              {err}
            </div>
            <div className="onb-actions">
              <button className="onb-back" onClick={back}>
                Back
              </button>
              <button className="onb-primary" onClick={finish}>
                Start using TuCasa
              </button>
            </div>
          </div>
        )}
      </div>
      <Toast msg={msg} />
    </div>
  )
}
