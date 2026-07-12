import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toast, useToast } from '../../components/Toast'
import './auth.css'

type Mode = 'signup' | 'login'

export function SignIn() {
  const navigate = useNavigate()
  const { msg, show } = useToast()
  const [mode, setMode] = useState<Mode>('signup')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')

  const isLogin = mode === 'login'

  const submit = () => {
    if (!email.trim() || !pass) return setErr('Enter your email and password.')
    if (mode === 'signup' && pass.length < 8)
      return setErr('Password must be at least 8 characters.')
    setErr('')
    if (mode === 'signup') navigate('/onboarding')
    else navigate('/account')
  }

  const forgot = () => {
    if (!email.trim())
      return setErr('Enter your email above first, then tap Forgot password.')
    setErr('')
    show('If that email has an account, a reset link is on its way.')
  }

  return (
    <div className="auth-screen">
      <div className="signin-card">
        <div style={{ marginBottom: 26 }}>
          <div className="signin-logo">
            Tu<span className="accent">Casa</span>
          </div>
          <div className="signin-rule" />
          <div className="signin-tagline">Finding a job should be this easy.</div>
        </div>

        <p className="signin-lead">
          {isLogin
            ? 'Welcome back. Log in to pick up your search.'
            : 'Create your account. Your search, private to you.'}
        </p>

        <div className="signin-fields">
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoCapitalize="off"
            autoCorrect="off"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <input
            className="auth-input"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={isLogin ? 'Password' : 'Password (8+ characters)'}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button className="signin-submit" onClick={submit}>
            {isLogin ? 'Log in' : 'Start free'}
          </button>
        </div>

        <div className="signin-swap">
          {isLogin ? 'New here?' : 'Already have an account?'}{' '}
          <a
            className="signin-swap-link"
            onClick={() => {
              setMode(isLogin ? 'signup' : 'login')
              setErr('')
            }}
          >
            {isLogin ? 'Create an account' : 'Log in'}
          </a>
        </div>

        {isLogin && (
          <div className="signin-forgot">
            <a onClick={forgot}>Forgot password?</a>
          </div>
        )}

        <div className="auth-err">{err}</div>
      </div>
      <Toast msg={msg} />
    </div>
  )
}
