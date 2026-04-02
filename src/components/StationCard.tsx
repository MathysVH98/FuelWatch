import { useNavigate } from 'react-router-dom'
import type { Station, FuelType } from '../types'
import { formatPrice } from '../lib/priceColors'

interface StationCardProps {
  station: Station
  fuelType: FuelType
  priceColor: string
  rank: number
  onTap: () => void
  /** True when the displayed price comes from DMRE official data, not a user report */
  isDmre?: boolean
}

const BRAND_COLORS: Record<string, string> = {
  BP: '#00AA44',
  SASOL: '#FF6B00',
  ENGEN: '#E8001A',
  TOTAL: '#E8001A',
  SHELL: '#FFD100',
  CALTEX: '#003087',
}

function BrandBadge({ brand }: { brand: string }) {
  const color = BRAND_COLORS[brand] ?? '#4A6080'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 4,
        background: `${color}22`,
        border: `1px solid ${color}55`,
        color: color,
        fontFamily: 'var(--font-hud)',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.08em',
      }}
    >
      {brand}
    </span>
  )
}

export function StationCard({ station, fuelType, priceColor, rank, onTap, isDmre }: StationCardProps) {
  const price = station.prices?.[fuelType]
  const navigate = useNavigate()

  function handleReport(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/report?fuel=${fuelType}&station=${station.id}`)
  }

  return (
    <button
      onClick={onTap}
      style={styles.card}
      aria-label={`${station.name} — tap for directions`}
    >
      {/* Rank */}
      <div style={styles.rank}>
        <span style={styles.rankText}>#{rank}</span>
      </div>

      {/* Main content */}
      <div style={styles.body}>
        <div style={styles.topRow}>
          <div style={styles.nameWrap}>
            <span style={styles.name}>{station.name}</span>
            <BrandBadge brand={station.brand} />
          </div>
          <div style={{ ...styles.pricePill, borderColor: `${priceColor}44`, background: `${priceColor}14` }}>
            {isDmre && <span style={styles.dmreMicro}>DMRE</span>}
            <span style={{ ...styles.priceText, color: priceColor }}>
              {price !== undefined ? formatPrice(price) : '—'}
            </span>
          </div>
        </div>

        <div style={styles.bottomRow}>
          {station.address && (
            <span style={styles.address}>{station.address}</span>
          )}
          <div style={styles.meta}>
            {station.distance !== undefined && (
              <span style={styles.distance}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 3 }}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {station.distance < 1
                  ? `${Math.round(station.distance * 1000)}m`
                  : `${station.distance.toFixed(1)}km`}
              </span>
            )}
            {/* Report CTA — nudges users to correct DMRE placeholder prices */}
            <button onClick={handleReport} style={styles.reportBtn} aria-label="Report a different price">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {isDmre ? 'different price?' : 'update'}
            </button>
          </div>
        </div>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ flexShrink: 0, marginLeft: 4 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}

const styles = {
  card: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background 0.15s ease',
    textAlign: 'left' as const,
    minHeight: 72,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankText: {
    fontFamily: 'var(--font-data)',
    fontSize: '11px',
    color: 'var(--muted)',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    minWidth: 0,
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  nameWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    minWidth: 0,
  },
  name: {
    fontFamily: 'var(--font-hud)',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    color: 'var(--text)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pricePill: {
    flexShrink: 0,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  },
  dmreMicro: {
    fontFamily: 'var(--font-hud)',
    fontSize: '7px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: 'var(--cyan)',
    opacity: 0.8,
  },
  priceText: {
    fontFamily: 'var(--font-data)',
    fontSize: '14px',
    fontWeight: 500,
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  address: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    flex: 1,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  distance: {
    fontFamily: 'var(--font-data)',
    fontSize: '11px',
    color: 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
  },
  reportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    padding: '3px 7px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--muted)',
    fontFamily: 'var(--font-hud)',
    fontSize: '9px',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    flexShrink: 0 as const,
  },
}
