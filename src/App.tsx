import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { BottomNav } from './components/BottomNav'
import { StationsPage } from './pages/StationsPage'
import { MapPage } from './pages/MapPage'
import { ReportPage } from './pages/ReportPage'
import { AlertsPage } from './pages/AlertsPage'
import LoginPage from './pages/LoginPage'
import './styles/globals.css'

function AppRouter() {
  const { session, loading } = useAuthContext()

  if (loading) {
    return (
      <div style={loadingStyles.wrap}>
        <div style={loadingStyles.logo}>
          FUEL<span style={{ color: 'var(--accent)' }}>WATCH</span>
        </div>
        <div style={loadingStyles.label}>LOADING...</div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
        <Routes>
          <Route path="/" element={<StationsPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

const loadingStyles = {
  wrap: {
    minHeight: '100svh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    fontFamily: 'var(--font-hud)',
    fontSize: 28,
    fontWeight: 900,
    color: 'var(--cyan)',
    letterSpacing: '0.1em',
    textShadow: '0 0 24px rgba(0,200,255,0.4)',
  },
  label: {
    fontFamily: 'var(--font-hud)',
    fontSize: 11,
    letterSpacing: '0.2em',
    color: 'var(--muted)',
  },
}
