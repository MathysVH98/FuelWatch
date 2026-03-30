import type { PriceAlert } from '../types'

interface AlertCardProps {
  alert: PriceAlert
  onRead: () => void
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function AlertCard({ alert, onRead }: AlertCardProps) {
  const isDmre = alert.type === 'dmre_change'
  const accentColor = isDmre ? 'var(--yellow)' : 'var(--cyan)'

  return (
    <button
      onClick={onRead}
      style={{
        ...styles.card,
        borderLeftColor: accentColor,
        opacity: alert.read ? 0.5 : 1,
      }}
      aria-label={alert.title}
    >
      {/* Icon */}
      <div style={{ ...styles.iconWrap, background: `${accentColor}14`, border: `1px solid ${accentColor}33` }}>
        {isDmre ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.topRow}>
          <span style={{ ...styles.title, color: alert.read ? 'var(--muted)' : 'var(--text)' }}>
            {alert.title}
          </span>
          {!alert.read && <div style={styles.unreadDot} />}
        </div>
        <span style={styles.body}>{alert.body}</span>
        <span style={styles.time}>{timeAgo(alert.created_at)}</span>
      </div>
    </button>
  )
}

const styles = {
  card: {
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'opacity 0.2s ease',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    minWidth: 0,
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontFamily: 'var(--font-hud)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--cyan)',
    flexShrink: 0,
  },
  body: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
  time: {
    fontFamily: 'var(--font-data)',
    fontSize: '10px',
    color: 'var(--muted)',
    opacity: 0.6,
    marginTop: 2,
  },
}
