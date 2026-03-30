import { useState } from 'react'
import { signIn, signUp } from '../lib/auth'

export default function LoginPage() {
  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit() {
    if (!email || !password) return
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signup') {
        await signUp(email, password, name)
      } else {
        await signIn(email, password)
      }
      // useAuth hook in AuthContext will automatically detect the new session
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh', background: '#060A12', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', fontFamily: "'Syne', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 24, fontWeight: 900,
        color: '#00C8FF', textShadow: '0 0 20px rgba(0,200,255,0.5)', marginBottom: 8 }}>
        FUEL<span style={{ color: '#FF6B00' }}>WATCH</span>
      </div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11,
        color: '#4A6080', letterSpacing: 2, marginBottom: 40 }}>
        SA FUEL PRICE TRACKER
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 380, background: '#0B1220',
        border: '1px solid rgba(0,200,255,0.2)', borderRadius: 16, padding: 24 }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24,
          background: '#060A12', borderRadius: 10, padding: 4 }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: "'Orbitron',monospace", fontSize: 10, letterSpacing: 1,
              background: mode === m ? 'rgba(0,200,255,0.1)' : 'transparent',
              color: mode === m ? '#00C8FF' : '#4A6080',
              transition: 'all 0.2s',
            }}>
              {m === 'login' ? 'SIGN IN' : 'REGISTER'}
            </button>
          ))}
        </div>

        {/* Fields */}
        {mode === 'signup' && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>DISPLAY NAME</label>
            <input style={inputStyle} placeholder="e.g. TJ" value={name}
              onChange={e => setName(e.target.value)} />
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>EMAIL</label>
          <input style={inputStyle} type="email" placeholder="you@email.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>PASSWORD</label>
          <input style={inputStyle} type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(255,61,90,0.1)', border: '1px solid rgba(255,61,90,0.3)',
            fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#FF3D5A' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: 15, borderRadius: 12, border: '1px solid rgba(255,107,0,0.5)',
          background: 'rgba(255,107,0,0.15)', color: '#FF6B00',
          fontFamily: "'Orbitron',monospace", fontSize: 12, fontWeight: 700,
          letterSpacing: 2, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1, transition: 'all 0.2s',
        }}>
          {loading ? 'PLEASE WAIT...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </button>
      </div>

      <div style={{ marginTop: 20, fontFamily: "'DM Mono',monospace",
        fontSize: 10, color: '#4A6080', textAlign: 'center', lineHeight: 1.8 }}>
        By signing in you agree to report accurate prices.<br />
        Fake reports will reduce your reputation score.
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'DM Mono',monospace", fontSize: 10,
  color: '#4A6080', letterSpacing: 1, marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#060A12', border: '1px solid rgba(0,200,255,0.25)',
  borderRadius: 10, padding: '12px 14px', color: '#D8E8FF',
  fontFamily: "'Syne',sans-serif", fontSize: 14, outline: 'none',
}