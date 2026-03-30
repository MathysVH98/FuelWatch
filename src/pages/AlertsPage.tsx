import { useAlerts } from '../hooks/useAlerts'
import { AlertCard } from '../components/AlertCard'

export function AlertsPage() {
  const { alerts, prefs, toggleDmre, toggleCheaper, markRead } = useAlerts()

  const unreadCount = alerts.filter((a) => !a.read).length

  return (
    <div className="page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>ALERTS</h1>
          {unreadCount > 0 && (
            <div style={styles.badge}>
              <span style={styles.badgeText}>{unreadCount}</span>
            </div>
          )}
        </div>
        <span style={styles.subtitle}>Price notifications</span>
      </div>

      <div style={styles.content}>
        {/* Preferences */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>NOTIFICATIONS</h2>
          <div style={styles.toggleCard}>
            <ToggleRow
              label="Monthly Price Change"
              description="DMRE petrol price updates"
              enabled={prefs.dmreChange}
              onToggle={toggleDmre}
            />
            <div style={styles.toggleDivider} />
            <ToggleRow
              label="Cheaper Station Found"
              description="When a lower diesel price is nearby"
              enabled={prefs.cheaperFound}
              onToggle={toggleCheaper}
            />
          </div>
        </div>

        {/* Alerts list */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>RECENT</h2>

          {alerts.length === 0 ? (
            <div style={styles.emptyState}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <p style={styles.emptyText}>No alerts yet</p>
            </div>
          ) : (
            <div style={styles.alertList}>
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onRead={() => markRead(alert.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Push notification note */}
        <div style={styles.pushNote}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={styles.pushNoteText}>
            Push notifications require the native app. Alerts shown here are fetched on open.
          </span>
        </div>
      </div>
    </div>
  )
}

interface ToggleRowProps {
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}

function ToggleRow({ label, description, enabled, onToggle }: ToggleRowProps) {
  return (
    <div style={styles.toggleRow}>
      <div style={styles.toggleInfo}>
        <span style={styles.toggleLabel}>{label}</span>
        <span style={styles.toggleDesc}>{description}</span>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        style={{
          ...styles.toggle,
          background: enabled ? 'var(--cyan)' : 'var(--surface2)',
          borderColor: enabled ? 'var(--cyan)' : 'var(--border)',
        }}
        aria-label={`Toggle ${label}`}
      >
        <div
          style={{
            ...styles.toggleThumb,
            transform: enabled ? 'translateX(20px)' : 'translateX(2px)',
            background: enabled ? 'var(--bg)' : 'var(--muted)',
          }}
        />
      </button>
    </div>
  )
}

const styles = {
  page: {},
  header: {
    padding: '20px 20px 8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: 'var(--font-hud)',
    fontSize: '22px',
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: 'var(--cyan)',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
  },
  badgeText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--muted)',
    display: 'block',
    marginTop: 4,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 24,
    padding: '16px 16px 24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'var(--font-hud)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: 'var(--muted)',
    fontWeight: 600,
  },
  toggleCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    gap: 16,
    minHeight: 64,
  },
  toggleDivider: {
    height: 1,
    background: 'var(--border)',
    margin: '0 16px',
  },
  toggleInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  toggleLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '0.03em',
  },
  toggleDesc: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    border: '1px solid',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'background 0.2s ease, border-color 0.2s ease',
    position: 'relative' as const,
    padding: 0,
    minHeight: 26,
  },
  toggleThumb: {
    position: 'absolute' as const,
    top: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    transition: 'transform 0.2s ease, background 0.2s ease',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    padding: '32px 0',
  },
  emptyText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '12px',
    letterSpacing: '0.1em',
    color: 'var(--muted)',
  },
  pushNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '12px 14px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
  },
  pushNoteText: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
}
