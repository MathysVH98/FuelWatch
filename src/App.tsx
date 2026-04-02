import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { BottomNav } from './components/BottomNav'
import { Sidebar } from './components/Sidebar'
import { StationsPage } from './pages/StationsPage'
import { MapPage } from './pages/MapPage'
import { ReportPage } from './pages/ReportPage'
import { AlertsPage } from './pages/AlertsPage'
import { AdminPricesPage } from './pages/AdminPricesPage'
import LoginPage from './pages/LoginPage'
import './styles/globals.css'

function AppRouter() {
  const { session, loading } = useAuthContext()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
          <Route
            path="/admin/prices"
            element={
              session.user.email === 'tj.vanheerden717@gmail.com'
                ? <AdminPricesPage />
                : <Navigate to="/" replace />
            }
          />
        </Routes>
        <BottomNav />

        {/* Hamburger button — fixed top-left, always visible */}
        <button
          onClick={() => setSidebarOpen(true)}
          style={hamburgerStyles.btn}
          aria-label="Open menu"
        >
          <span style={hamburgerStyles.line} />
          <span style={hamburgerStyles.line} />
          <span style={{ ...hamburgerStyles.line, width: 14 }} />
        </button>

        {/* Sidebar drawer */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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

const hamburgerStyles = {
  btn: {
    position: 'fixed' as const,
    top: 16,
    left: 16,
    zIndex: 150,
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(6,10,18,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--border2)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
  },
  line: {
    display: 'block',
    width: 18,
    height: 2,
    borderRadius: 2,
    background: 'var(--text)',
  },
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
