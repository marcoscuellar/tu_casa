import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toast, useToast } from '../../components/Toast'
import { useAppFlow } from '../../flow/AppFlowContext'
import { formatClock } from '../../lib/useClock'
import './auth.css'
import './Account.css'

const ASSETS = [
  'Capacity Map',
  'Talent Map',
  'Blueprint',
  'Cost Analysis',
  'Hiring Signal Map',
  'Role Gap Analysis',
]

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type Modal = 'email' | 'delete' | 'identity' | null

export function Account() {
  const navigate = useNavigate()
  const { msg, show } = useToast()
  const flow = useAppFlow()

  const [email, setEmail] = useState(flow.email || 'you@email.com')
  const [verified, setVerified] = useState(false)
  const [savedName, setSavedName] = useState(flow.name || '')
  const [savedField, setSavedField] = useState('')
  const [intro, setIntro] = useState(
    'I run a team focused on adding engineering capacity without unnecessary overhead.',
  )
  const [cred, setCred] = useState('')
  const [asset, setAsset] = useState(ASSETS[0])

  const [modal, setModal] = useState<Modal>(null)

  const initials =
    (savedName || email || '?')
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('') || '?'
  const idName = savedName || 'Not set yet'
  const today = formatClock(new Date()).split(' · ')[0]

  return (
    <div className="acct-screen">
      <div className="acct-wrap">
        {/* Top nav */}
        <div className="acct-nav">
          <div className="acct-logo">
            Tu<span className="accent">Casa</span>
          </div>
          <div className="acct-nav-right">
            <span className="acct-today">{today}</span>
            <div className="acct-avatar">{initials}</div>
          </div>
        </div>

        <div className="acct-title">Account</div>

        {!verified && (
          <div className="acct-nudge">
            Confirm your email to secure your account — check your inbox.{' '}
            <a onClick={() => show('Verification email sent.')}>Resend</a>
          </div>
        )}

        {/* Account card */}
        <div className="acct-card">
          <h3 className="acct-card-label">Account</h3>
          <div className="acct-row">
            <div className="acct-row-main">
              Signed in as
              <span className="acct-row-sub">
                {email}
                {verified ? '' : ' · unverified'}
              </span>
            </div>
            <button className="acct-mini" onClick={() => setModal('email')}>
              Change email
            </button>
          </div>
          <div className="acct-row acct-row-div">
            <div className="acct-row-main">
              Delete account
              <span className="acct-row-sub">
                Permanently remove your account and all data.
              </span>
            </div>
            <button
              className="acct-mini acct-danger"
              onClick={() => setModal('delete')}
            >
              Delete account
            </button>
          </div>
        </div>

        {/* Billing card */}
        <div className="acct-card">
          <h3 className="acct-card-label">Billing</h3>
          <div className="acct-row">
            <div className="acct-row-main">
              Plan
              <span className="acct-row-sub">Free — first 25 outreaches</span>
            </div>
            <button
              className="acct-cta"
              onClick={() => show('Unlimited is coming soon.')}
            >
              Get unlimited
            </button>
          </div>
          <div className="acct-row acct-row-div">
            <div className="acct-row-main">
              Payment method
              <span className="acct-row-sub">
                $11/month after your first 25 outreaches.
              </span>
            </div>
            <span className="acct-soon">Coming soon</span>
          </div>
        </div>

        {/* Outreach identity card */}
        <div className="acct-card">
          <h3 className="acct-card-label">Outreach identity</h3>
          <div className="acct-row">
            <div className="acct-row-main">
              {idName}
              <span className="acct-row-sub">
                {savedField || 'How AI introduces you'}
              </span>
            </div>
            <button className="acct-mini" onClick={() => setModal('identity')}>
              Edit
            </button>
          </div>
        </div>

        {/* Data card */}
        <div className="acct-card">
          <h3 className="acct-card-label">Data</h3>
          <div className="acct-data-btns">
            <button className="acct-mini" onClick={() => show('Backup exported.')}>
              Export backup
            </button>
            <button className="acct-mini" onClick={() => show('Restore ready.')}>
              Restore
            </button>
            <button
              className="acct-mini"
              onClick={() => show('Duplicates removed.')}
            >
              Delete duplicates
            </button>
            <button
              className="acct-mini acct-danger"
              onClick={() => show('Everything cleared.')}
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="acct-logout">
          <button className="acct-mini" onClick={() => navigate('/signin')}>
            Log out
          </button>
        </div>
      </div>

      {modal && (
        <AccountModal
          kind={modal}
          email={email}
          savedName={savedName}
          savedField={savedField}
          intro={intro}
          cred={cred}
          asset={asset}
          onClose={() => setModal(null)}
          onChangeEmail={(nextEmail) => {
            setEmail(nextEmail)
            setVerified(false)
            setModal(null)
            show('Almost there — confirm from your new inbox.')
          }}
          onDelete={() => {
            setModal(null)
            show('Your account was deleted.')
            setTimeout(() => navigate('/signin'), 700)
          }}
          onSaveIdentity={(id) => {
            setSavedName(id.name)
            setSavedField(id.field)
            setIntro(id.intro)
            setCred(id.cred)
            setAsset(id.asset)
            setModal(null)
            show('Outreach identity updated.')
          }}
        />
      )}
      <Toast msg={msg} />
    </div>
  )
}

interface Identity {
  name: string
  field: string
  intro: string
  cred: string
  asset: string
}

function AccountModal(props: {
  kind: Exclude<Modal, null>
  email: string
  savedName: string
  savedField: string
  intro: string
  cred: string
  asset: string
  onClose: () => void
  onChangeEmail: (email: string) => void
  onDelete: () => void
  onSaveIdentity: (id: Identity) => void
}) {
  const { kind } = props
  const [mNew, setMNew] = useState('')
  const [mPw, setMPw] = useState('')
  const [mType, setMType] = useState('')
  const [name, setName] = useState(props.savedName)
  const [field, setField] = useState(props.savedField)
  const [intro, setIntro] = useState(props.intro)
  const [cred, setCred] = useState(props.cred)
  const [asset, setAsset] = useState(props.asset)
  const [err, setErr] = useState('')

  let title = ''
  let help = ''
  let btnLabel = ''
  let danger = false
  let body: React.ReactNode = null
  let submit = () => {}

  if (kind === 'email') {
    title = 'Change email'
    help =
      'Enter your new email and password. We’ll send a confirmation link to the new address; your login changes once confirmed.'
    btnLabel = 'Send confirmation'
    body = (
      <>
        <Field label="Current email">
          <input className="mdl-input" disabled value={props.email} />
        </Field>
        <Field label="New email">
          <input
            className="mdl-input"
            type="email"
            value={mNew}
            placeholder="you@company.com"
            onChange={(e) => setMNew(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            className="mdl-input"
            type="password"
            value={mPw}
            placeholder="Confirm it’s you"
            onChange={(e) => setMPw(e.target.value)}
          />
        </Field>
      </>
    )
    submit = () => {
      if (!EMAIL_RE.test(mNew.trim()))
        return setErr('Enter a valid email address.')
      if (!mPw) return setErr('Enter your password.')
      props.onChangeEmail(mNew.trim())
    }
  } else if (kind === 'delete') {
    title = 'Delete account'
    help =
      'This permanently deletes your account, contacts, drafts, and history. It cannot be undone.'
    btnLabel = 'Delete my account'
    danger = true
    body = (
      <>
        <Field label="Type DELETE to confirm">
          <input
            className="mdl-input"
            value={mType}
            placeholder="DELETE"
            onChange={(e) => setMType(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            className="mdl-input"
            type="password"
            value={mPw}
            onChange={(e) => setMPw(e.target.value)}
          />
        </Field>
      </>
    )
    submit = () => {
      if (mType.trim() !== 'DELETE') return setErr('Type DELETE to confirm.')
      if (!mPw) return setErr('Enter your password.')
      props.onDelete()
    }
  } else {
    title = 'Outreach identity'
    help = 'How AI introduces you after opening on the prospect’s company or role.'
    btnLabel = 'Save'
    body = (
      <>
        <Field label="Full name">
          <input
            className="mdl-input"
            value={name}
            placeholder="Marcos Cuellar"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="What you do">
          <input
            className="mdl-input"
            value={field}
            placeholder="Role or field"
            onChange={(e) => setField(e.target.value)}
          />
        </Field>
        <Field label="Brief intro for outreach">
          <textarea
            className="mdl-input mdl-textarea"
            rows={3}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
        </Field>
        <Field label="Credibility line">
          <input
            className="mdl-input"
            value={cred}
            onChange={(e) => setCred(e.target.value)}
          />
        </Field>
        <Field label="Default asset">
          <select
            className="mdl-input"
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
        </Field>
      </>
    )
    submit = () => {
      if (!name.trim()) return setErr('Add your full name.')
      if (!intro.trim()) return setErr('Add a brief intro.')
      props.onSaveIdentity({ name: name.trim(), field: field.trim(), intro, cred, asset })
    }
  }

  return (
    <div className="mdl-backdrop" onClick={props.onClose}>
      <div className="mdl" onClick={(e) => e.stopPropagation()}>
        <button className="mdl-close" onClick={props.onClose} aria-label="Close">
          ×
        </button>
        <h2 className="mdl-title">{title}</h2>
        <p className="mdl-help">{help}</p>
        <div>{body}</div>
        <div className="mdl-err">{err}</div>
        <button
          className={`mdl-submit ${danger ? 'is-danger' : ''}`}
          onClick={submit}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mdl-field">
      <label className="mdl-label">{label}</label>
      {children}
    </div>
  )
}
