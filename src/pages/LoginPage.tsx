import { useState } from 'react'
import { signIn, signUp } from '../lib/auth'

// Translate raw Supabase error messages into friendly copy
function friendlyError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Email or password is incorrect.'
  if (m.includes('email not confirmed')) return 'Please verify your email — check your inbox.'
  if (m.includes('user already registered') || m.includes('already been registered')) return 'An account with this email already exists. Please sign in.'
  if (m.includes('password should be at least')) return 'Password must be at least 6 characters.'
  if (m.includes('unable to validate email')) return 'Please enter a valid email address.'
  if (m.includes('rate limit') || m.includes('too many requests')) return 'Too many attempts — please wait a moment and try again.'
  if (m.includes('network') || m.includes('fetch')) return 'No internet connection. Please check your network.'
  return msg
}

export default function LoginPage() {
  const [mode, setMode]             = useState<'login' | 'signup'>('login')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [emailSent, setEmailSent]   = useState(false)

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password, name.trim())
        // Supabase returns a session immediately when email confirmation is
        // disabled. If it's enabled, session is null and the user needs to
        // verify their inbox.
        if (!result.session) {
          setEmailSent(true)
        }
        // If session exists, onAuthStateChange in useAuth handles the redirect
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') void handleSubmit()
  }

  function switchMode(m: 'login' | 'signup') {
    setMode(m)
    setError(null)
    setEmailSent(false)
  }

  // ── Email verification waiting state ────────────────────────────────────────
  if (emailSent) {
    return (
      <div style={s.page}>
        <Logo />
        <div style={s.card}>
          <div style={s.verifyIcon}>✉️</div>
          <div style={s.verifyTitle}>Check your inbox</div>
          <div style={s.verifyBody}>
            We sent a verification link to <strong style={{ color: 'var(--cyan)' }}>{email.trim()}</strong>.
            Tap the link in the email and you'll be signed in automatically.
          </div>
          <button
            onClick={() => { setEmailSent(false); setMode('login') }}
            style={s.secondaryBtn}
          >
            BACK TO SIGN IN
          </button>
        </div>
      </div>
    )
  }

  // ── Main login / register form ───────────────────────────────────────────────
  return (
    <div style={s.page}>
      <Logo />

      <div style={s.card}>
        {/* Mode toggle */}
        <div style={s.toggle}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{ ...s.toggleBtn, ...(mode === m ? s.toggleBtnActive : {}) }}
            >
              {m === 'login' ? 'SIGN IN' : 'REGISTER'}
            </button>
          ))}
        </div>

        {/* Fields */}
        {mode === 'signup' && (
          <Field label="DISPLAY NAME">
            <input
              style={s.input}
              placeholder="e.g. TJ"
              value={name}
              autoComplete="name"
              autoCapitalize="words"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </Field>
        )}

        <Field label="EMAIL">
          <input
            style={s.input}
            type="email"
            placeholder="you@email.com"
            value={email}
            autoComplete="email"
            autoCapitalize="none"
            inputMode="email"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </Field>

        <Field label="PASSWORD" hint={mode === 'signup' ? 'Min. 6 characters' : undefined}>
          <div style={s.passwordWrap}>
            <input
              style={{ ...s.input, paddingRight: 44 }}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={s.eyeBtn}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        </Field>

        {/* Error */}
        {error && (
          <div style={s.errorBox}>{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.45 }}
        >
          {loading ? <Spinner /> : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </button>
      </div>

      <div style={s.footer}>
        By signing in you agree to report accurate prices.{'\n'}
        Fake reports will reduce your reputation score.
      </div>
    </div>
  )
}

// ── Small reusable bits ──────────────────────────────────────────────────────

function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <div style={s.logoText}>
        FUEL<span style={{ color: 'var(--accent)' }}>WATCH</span>
      </div>
      <div style={s.logoSub}>SA FUEL PRICE TRACKER</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={s.label}>{label}</label>
        {hint && <span style={s.hint}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div style={s.spinner} />
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100svh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(24px + var(--safe-top)) 24px calc(24px + var(--safe-bottom))',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-xl)',
    padding: 24,
  },
  logoText: {
    fontFamily: 'var(--font-hud)',
    fontSize: 26,
    fontWeight: 900,
    color: 'var(--cyan)',
    letterSpacing: '0.08em',
    textShadow: '0 0 24px rgba(0,200,255,0.4)',
  },
  logoSub: {
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    color: 'var(--muted)',
    letterSpacing: '0.18em',
    marginTop: 4,
  },
  toggle: {
    display: 'flex',
    background: 'var(--bg)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    padding: '9px 0',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-hud)',
    fontSize: 10,
    letterSpacing: '0.08em',
    background: 'transparent',
    color: 'var(--muted)',
    transition: 'all 0.2s',
    minHeight: 36,
  },
  toggleBtnActive: {
    background: 'rgba(0,200,255,0.1)',
    color: 'var(--cyan)',
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    color: 'var(--muted)',
    letterSpacing: '0.08em',
  },
  hint: {
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    color: 'var(--muted)',
    opacity: 0.6,
  },
  input: {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-md)',
    padding: '13px 14px',
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    minHeight: 'unset',
  },
  errorBox: {
    padding: '10px 14px',
    borderRadius: 10,
    marginBottom: 14,
    background: 'rgba(255,61,90,0.08)',
    border: '1px solid rgba(255,61,90,0.3)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: '#FF3D5A',
    lineHeight: 1.5,
  },
  submitBtn: {
    width: '100%',
    padding: 15,
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,107,0,0.5)',
    background: 'rgba(255,107,0,0.15)',
    color: 'var(--accent)',
    fontFamily: 'var(--font-hud)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 4,
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,107,0,0.3)',
    borderTop: '2px solid var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  verifyIcon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  verifyTitle: {
    fontFamily: 'var(--font-hud)',
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text)',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: '0.05em',
  },
  verifyBody: {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    color: 'var(--muted)',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 24,
  },
  secondaryBtn: {
    width: '100%',
    padding: 13,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border2)',
    background: 'transparent',
    color: 'var(--muted)',
    fontFamily: 'var(--font-hud)',
    fontSize: 11,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    minHeight: 48,
  },
  footer: {
    marginTop: 20,
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    color: 'var(--muted)',
    textAlign: 'center',
    lineHeight: 1.8,
    whiteSpace: 'pre-line',
    maxWidth: 280,
  },
}
