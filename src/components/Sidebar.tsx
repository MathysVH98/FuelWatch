import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { updateProfile, signOut } from '../lib/auth'
import type { FuelType, PriceZone } from '../types'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const ADMIN_EMAILS = ['tj.vanheerden717@gmail.com']

const NAV_ITEMS = [
  {
    to: '/', label: 'Stations', exact: true,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    to: '/map', label: 'Map', exact: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
  },
  {
    to: '/report', label: 'Report Price', exact: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  },
  {
    to: '/alerts', label: 'Alerts', exact: false,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  },
]

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'p93',   label: 'Petrol 93' },
  { value: 'p95',   label: 'Petrol 95' },
  { value: 'd005',  label: 'Diesel 500ppm' },
  { value: 'd0005', label: 'Diesel 50ppm' },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuthContext()
  // Profile edit state
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [zone, setZone] = useState<PriceZone>(user?.preferredZone ?? 'inland')
  const [fuel, setFuel] = useState<FuelType>(user?.preferredFuel ?? 'd005')
  const [notifyDmre, setNotifyDmre] = useState(user?.notifyDmre ?? false)
  const [notifyCheaper, setNotifyCheaper] = useState(user?.notifyCheaper ?? false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '')

  const initials = (displayName || user?.email || 'U')
    .split(' ')
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await updateProfile(user.id, {
      display_name:   displayName,
      preferred_zone: zone,
      preferred_fuel: fuel,
      notify_dmre:    notifyDmre,
      notify_cheaper: notifyCheaper,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await signOut()
    onClose()
  }

  function handleNavClick() {
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          ...s.backdrop,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
        }}
      />

      {/* Drawer */}
      <div style={{ ...s.drawer, transform: open ? 'translateX(0)' : 'translateX(-100%)' }}>

        {/* Header */}
        <div style={s.drawerHeader}>
          <div style={s.logoText}>
            FUEL<span style={{ color: 'var(--accent)' }}>WATCH</span>
          </div>
          <button onClick={onClose} style={s.closeBtn} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={s.scroll}>

          {/* Avatar + name */}
          <div style={s.profileHeader}>
            <div style={s.avatar}>
              <span style={s.avatarText}>{initials}</span>
            </div>
            <div style={s.profileInfo}>
              <div style={s.profileName}>{user?.displayName ?? user?.email ?? 'User'}</div>
              <div style={s.profileEmail}>{user?.email}</div>
              <div style={s.statRow}>
                <span style={s.stat}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  {user?.reportsCount ?? 0} reports
                </span>
                <span style={s.stat}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  {user?.reputation ?? 0} rep
                </span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div style={s.section}>
            <div style={s.sectionLabel}>NAVIGATE</div>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={handleNavClick}
                style={{ textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <div style={{ ...s.navItem, ...(isActive ? s.navItemActive : {}) }}>
                    <span style={{ color: isActive ? 'var(--cyan)' : 'var(--muted)' }}>{item.icon}</span>
                    <span style={{ ...s.navLabel, color: isActive ? 'var(--text)' : 'var(--muted)' }}>
                      {item.label}
                    </span>
                    {isActive && <div style={s.activeBar} />}
                  </div>
                )}
              </NavLink>
            ))}
          </div>

          <div style={s.divider} />

          {/* Edit display name */}
          <div style={s.section}>
            <div style={s.sectionLabel}>PROFILE</div>
            <div style={s.field}>
              <label style={s.fieldLabel}>Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                style={s.input}
              />
            </div>
          </div>

          <div style={s.divider} />

          {/* Preferences */}
          <div style={s.section}>
            <div style={s.sectionLabel}>PREFERENCES</div>

            <div style={s.field}>
              <label style={s.fieldLabel}>Default Zone</label>
              <div style={s.segmented}>
                {(['inland', 'coastal'] as PriceZone[]).map((z) => (
                  <button
                    key={z}
                    onClick={() => setZone(z)}
                    style={{ ...s.segBtn, ...(zone === z ? s.segBtnActive : s.segBtnInactive) }}
                  >
                    {z === 'inland' ? 'Inland' : 'Coastal'}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.fieldLabel}>Default Fuel</label>
              <div style={s.fuelGrid}>
                {FUEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFuel(opt.value)}
                    style={{ ...s.fuelBtn, ...(fuel === opt.value ? s.fuelBtnActive : s.fuelBtnInactive) }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={s.divider} />

          {/* Notifications */}
          <div style={s.section}>
            <div style={s.sectionLabel}>NOTIFICATIONS</div>
            <Toggle
              label="DMRE price announcements"
              desc="Alert when monthly prices are updated"
              value={notifyDmre}
              onChange={setNotifyDmre}
            />
            <Toggle
              label="Cheaper price nearby"
              desc="Alert when a lower price is reported near you"
              value={notifyCheaper}
              onChange={setNotifyCheaper}
            />
          </div>

          <div style={s.divider} />

          {/* Admin link — only visible to admin users */}
          {isAdmin && <div style={s.section}>
            <div style={s.sectionLabel}>ADMIN</div>
            <NavLink to="/admin/prices" onClick={handleNavClick} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{ ...s.navItem, ...(isActive ? s.navItemActive : {}) }}>
                  <span style={{ color: isActive ? 'var(--cyan)' : 'var(--muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
                    </svg>
                  </span>
                  <span style={{ ...s.navLabel, color: isActive ? 'var(--text)' : 'var(--muted)' }}>
                    Update Fuel Prices
                  </span>
                </div>
              )}
            </NavLink>
          </div>}

          {/* Save button */}
          <div style={s.section}>
            <button onClick={() => void handleSave()} disabled={saving} style={s.saveBtn}>
              {saved ? '✓ SAVED' : saving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
          </div>

          {/* Sign out */}
          <div style={{ ...s.section, marginTop: 'auto', paddingTop: 8 }}>
            <button onClick={() => void handleSignOut()} style={s.signOutBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              SIGN OUT
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

// ── Toggle sub-component ───────────────────────────────────────────────────────
function Toggle({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <button onClick={() => onChange(!value)} style={s.toggleRow}>
      <div style={s.toggleText}>
        <span style={s.toggleLabel}>{label}</span>
        <span style={s.toggleDesc}>{desc}</span>
      </div>
      <div style={{ ...s.toggleTrack, background: value ? 'var(--cyan)' : 'var(--surface2)' }}>
        <div style={{ ...s.toggleThumb, transform: value ? 'translateX(18px)' : 'translateX(2px)' }} />
      </div>
    </button>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  backdrop: {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)', zIndex: 300, transition: 'opacity 0.25s ease',
  },
  drawer: {
    position: 'fixed' as const, top: 0, left: 0, bottom: 0, width: 300,
    background: 'var(--surface)', borderRight: '1px solid var(--border2)',
    zIndex: 301, display: 'flex', flexDirection: 'column' as const,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
  },
  drawerHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  logoText: {
    fontFamily: 'var(--font-hud)', fontSize: 18, fontWeight: 900,
    letterSpacing: '0.1em', color: 'var(--cyan)',
  },
  closeBtn: {
    background: 'transparent', border: 'none', color: 'var(--muted)',
    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
  },
  scroll: {
    flex: 1, overflowY: 'auto' as const, display: 'flex',
    flexDirection: 'column' as const, paddingBottom: 'calc(16px + var(--safe-bottom))',
  },
  profileHeader: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '20px 20px 16px',
  },
  avatar: {
    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, var(--cyan) 0%, #0055aa 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 16px rgba(0,200,255,0.3)',
  },
  avatarText: {
    fontFamily: 'var(--font-hud)', fontSize: 18, fontWeight: 700,
    color: 'var(--bg)', letterSpacing: '0.05em',
  },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: {
    fontFamily: 'var(--font-hud)', fontSize: 14, fontWeight: 700,
    color: 'var(--text)', letterSpacing: '0.03em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  profileEmail: {
    fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)',
    marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  statRow: { display: 'flex', gap: 10, marginTop: 6 },
  stat: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontFamily: 'var(--font-data)', fontSize: 10, color: 'var(--muted)',
  },
  section: { padding: '12px 20px' },
  sectionLabel: {
    fontFamily: 'var(--font-hud)', fontSize: '9px', letterSpacing: '0.14em',
    color: 'var(--muted)', marginBottom: 10, opacity: 0.6,
  },
  divider: { height: 1, background: 'var(--border)', margin: '0 20px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
    borderRadius: 8, cursor: 'pointer', position: 'relative' as const,
    transition: 'background 0.15s ease',
  },
  navItemActive: { background: 'rgba(0,200,255,0.08)' },
  navLabel: { fontFamily: 'var(--font-body)', fontSize: 14, flex: 1 },
  activeBar: {
    position: 'absolute' as const, right: 0, top: '50%', transform: 'translateY(-50%)',
    width: 3, height: 20, background: 'var(--cyan)', borderRadius: 2,
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: 'var(--font-hud)', fontSize: '9px', letterSpacing: '0.1em',
    color: 'var(--muted)', display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '10px 12px', background: 'var(--surface2)',
    border: '1px solid var(--border2)', borderRadius: 8,
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box' as const,
  },
  segmented: { display: 'flex', gap: 6 },
  segBtn: {
    flex: 1, padding: '8px 0', borderRadius: 6, border: '1px solid',
    fontFamily: 'var(--font-hud)', fontSize: '10px', letterSpacing: '0.06em',
    cursor: 'pointer', transition: 'all 0.15s ease',
  },
  segBtnActive: { background: 'rgba(0,200,255,0.12)', borderColor: 'var(--cyan)', color: 'var(--cyan)' },
  segBtnInactive: { background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--muted)' },
  fuelGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  fuelBtn: {
    padding: '8px 6px', borderRadius: 6, border: '1px solid',
    fontFamily: 'var(--font-hud)', fontSize: '9px', letterSpacing: '0.04em',
    cursor: 'pointer', transition: 'all 0.15s ease',
  },
  fuelBtnActive: { background: 'rgba(0,200,255,0.12)', borderColor: 'var(--cyan)', color: 'var(--cyan)' },
  fuelBtnInactive: { background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--muted)' },
  toggleRow: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' as const,
  },
  toggleText: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  toggleLabel: { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)' },
  toggleDesc: { fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--muted)' },
  toggleTrack: {
    width: 40, height: 22, borderRadius: 11, flexShrink: 0,
    position: 'relative' as const, transition: 'background 0.2s ease',
  },
  toggleThumb: {
    position: 'absolute' as const, top: 2, width: 18, height: 18,
    borderRadius: '50%', background: '#fff',
    transition: 'transform 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  saveBtn: {
    width: '100%', padding: '12px', background: 'var(--cyan)', border: 'none',
    borderRadius: 8, color: 'var(--bg)', fontFamily: 'var(--font-hud)',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
  },
  signOutBtn: {
    width: '100%', padding: '12px', background: 'rgba(255,61,90,0.08)',
    border: '1px solid rgba(255,61,90,0.25)', borderRadius: 8,
    color: '#ff3d5a', fontFamily: 'var(--font-hud)', fontSize: '11px',
    fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
}
