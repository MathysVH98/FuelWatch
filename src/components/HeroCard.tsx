import type { Station, FuelType } from '../types'

interface HeroCardProps {
  station: Station | null
  fuelType: FuelType
  onTap: () => void
}

const FUEL_LABELS: Record<FuelType, string> = {
  p93: 'Petrol 93',
  p95: 'Petrol 95',
  d005: 'Diesel 0.05%',
  d0005: 'Diesel 0.005%',
}

export function HeroCard({ station, fuelType, onTap }: HeroCardProps) {
  if (!station) {
    return (
      <div style={{ ...styles.card, opacity: 0.5 }}>
        <div style={styles.label}>BEST DEAL</div>
        <div style={styles.emptyText}>No data yet — be the first to report a price.</div>
      </div>
    )
  }

  const price = station.prices?.[fuelType]

  return (
    <button onClick={onTap} style={styles.card} aria-label={`Best deal: ${station.name}`}>
      {/* Top row */}
      <div style={styles.topRow}>
        <span style={styles.label}>BEST DEAL</span>
        <span style={styles.fuelBadge}>{FUEL_LABELS[fuelType]}</span>
      </div>

      {/* Price big display */}
      <div style={styles.priceRow}>
        {price !== undefined ? (
          <>
            <span style={styles.pricePrefix}>R</span>
            <span style={styles.priceMain}>{(price / 100).toFixed(2)}</span>
            <span style={styles.priceSuffix}>/L</span>
          </>
        ) : (
          <span style={styles.noPrice}>—</span>
        )}
      </div>

      {/* Station info */}
      <div style={styles.stationRow}>
        <div style={styles.stationInfo}>
          <span style={styles.stationName}>{station.name}</span>
          {station.address && (
            <span style={styles.stationAddress}>{station.address}</span>
          )}
        </div>
        {station.distance !== undefined && (
          <span style={styles.distanceBadge}>
            {station.distance < 1
              ? `${Math.round(station.distance * 1000)}m away`
              : `${station.distance.toFixed(1)}km away`}
          </span>
        )}
      </div>

      {/* CTA */}
      <div style={styles.cta}>
        <span style={styles.ctaText}>TAP FOR DIRECTIONS</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}

const styles = {
  card: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(0,200,255,0.08) 0%, rgba(11,18,32,0.9) 60%)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-xl)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    position: 'relative' as const,
    overflow: 'hidden',
    boxShadow: '0 0 24px rgba(0, 200, 255, 0.08)',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: 'var(--font-hud)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: 'var(--cyan)',
    fontWeight: 700,
  },
  fuelBadge: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    background: 'var(--surface2)',
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid var(--border)',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  pricePrefix: {
    fontFamily: 'var(--font-hud)',
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--cyan)',
    opacity: 0.7,
  },
  priceMain: {
    fontFamily: 'var(--font-data)',
    fontSize: '44px',
    fontWeight: 500,
    color: 'var(--cyan)',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  priceSuffix: {
    fontFamily: 'var(--font-hud)',
    fontSize: '16px',
    color: 'var(--muted)',
    marginLeft: 4,
  },
  noPrice: {
    fontFamily: 'var(--font-data)',
    fontSize: '44px',
    color: 'var(--muted)',
  },
  stationRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  stationInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    minWidth: 0,
  },
  stationName: {
    fontFamily: 'var(--font-hud)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    letterSpacing: '0.03em',
  },
  stationAddress: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  distanceBadge: {
    flexShrink: 0,
    fontFamily: 'var(--font-data)',
    fontSize: '12px',
    color: 'var(--green)',
    background: 'rgba(0, 255, 136, 0.08)',
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid rgba(0, 255, 136, 0.2)',
  },
  cta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ctaText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    color: 'var(--cyan)',
    opacity: 0.7,
  },
  emptyText: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--muted)',
  },
}
