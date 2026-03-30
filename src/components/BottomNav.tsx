import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: JSX.Element
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Stations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/map',
    label: 'Map',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    to: '/report',
    label: 'Report',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    to: '/alerts',
    label: 'Alerts',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav style={styles.nav}>
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} style={{ textDecoration: 'none', flex: 1 }}>
          {({ isActive }) => (
            <div style={{ ...styles.item, color: isActive ? 'var(--cyan)' : 'var(--muted)' }}>
              <div style={{ ...styles.iconWrap, ...(isActive ? styles.iconActive : {}) }}>
                {item.icon}
              </div>
              <span style={{ ...styles.label, ...(isActive ? styles.labelActive : {}) }}>
                {item.label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 'calc(var(--nav-height) + var(--safe-bottom))',
    paddingBottom: 'var(--safe-bottom)',
    background: 'rgba(6, 10, 18, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'stretch',
    zIndex: 100,
  },
  item: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '8px 0',
    transition: 'color 0.15s ease',
    height: '100%',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    transition: 'background 0.15s ease',
  },
  iconActive: {
    background: 'rgba(0, 200, 255, 0.1)',
  },
  label: {
    fontFamily: 'var(--font-hud)',
    fontSize: '9px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    transition: 'color 0.15s ease',
  },
  labelActive: {
    color: 'var(--cyan)',
  },
}
