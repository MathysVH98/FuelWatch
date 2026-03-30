import { formatPrice } from '../lib/priceColors'
import type { PriceZone } from '../types'

interface PriceBandProps {
  cheapest: number | null
  average: number | null
  priciest: number | null
  /** Regulated petrol: show DMRE official price instead of a spread */
  isRegulated?: boolean
  dmrePrice?: number | null
  dmreMax?: number | null
  effectiveDate?: string | null
  zone?: PriceZone
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function PriceBand({
  cheapest, average, priciest,
  isRegulated, dmrePrice, dmreMax,
  effectiveDate, zone,
}: PriceBandProps) {

  // ── Regulated petrol: single-column official price ─────────
  if (isRegulated) {
    return (
      <div style={styles.regulatedWrapper}>
        <div style={styles.regulatedLeft}>
          <span style={styles.dmreBadge}>DMRE OFFICIAL</span>
          {effectiveDate && (
            <span style={styles.dateText}>Effective {formatDate(effectiveDate)}</span>
          )}
        </div>
        <div style={styles.regulatedRight}>
          {zone && (
            <span style={styles.zoneLabel}>{zone.toUpperCase()}</span>
          )}
          <span style={styles.regulatedPrice}>
            {dmrePrice !== null && dmrePrice !== undefined ? formatPrice(dmrePrice) : '—'}
          </span>
          <span style={styles.regulatedSuffix}>/L</span>
        </div>
      </div>
    )
  }

  // ── Diesel: spread + optional DMRE max column ───────────────
  return (
    <div style={styles.wrapper}>
      <BandItem label="CHEAPEST" value={cheapest} color="var(--green)" />
      <div style={styles.divider} />
      <BandItem label="AVERAGE"  value={average}  color="var(--yellow)" />
      <div style={styles.divider} />
      <BandItem label="PRICIEST" value={priciest}  color="var(--red)" />
      {dmreMax !== null && dmreMax !== undefined && (
        <>
          <div style={styles.divider} />
          <BandItem label="DMRE MAX" value={dmreMax} color="var(--muted)" />
        </>
      )}
    </div>
  )
}

function BandItem({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div style={styles.item}>
      <span style={{ ...styles.dot, background: color }} />
      <div style={styles.textStack}>
        <span style={styles.label}>{label}</span>
        <span style={{ ...styles.value, color }}>
          {value !== null ? formatPrice(value) : '—'}
        </span>
      </div>
    </div>
  )
}

const styles = {
  // ── Diesel spread ────────────────────────────────────────────
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    gap: 0,
  },
  item: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  textStack: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontFamily: 'var(--font-hud)',
    fontSize: '8px',
    letterSpacing: '0.1em',
    color: 'var(--muted)',
  },
  value: {
    fontFamily: 'var(--font-data)',
    fontSize: '13px',
    fontWeight: 500,
  },
  divider: {
    width: 1,
    height: 32,
    background: 'var(--border)',
    margin: '0 12px',
    flexShrink: 0,
  },
  // ── Regulated petrol ─────────────────────────────────────────
  regulatedWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--surface)',
    border: '1px solid rgba(0, 200, 255, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    gap: 12,
  },
  regulatedLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  dmreBadge: {
    fontFamily: 'var(--font-hud)',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: 'var(--cyan)',
    background: 'rgba(0, 200, 255, 0.1)',
    border: '1px solid rgba(0, 200, 255, 0.25)',
    borderRadius: 4,
    padding: '2px 6px',
    alignSelf: 'flex-start' as const,
  },
  dateText: {
    fontFamily: 'var(--font-data)',
    fontSize: '10px',
    color: 'var(--muted)',
  },
  regulatedRight: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    flexShrink: 0,
  },
  zoneLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: '9px',
    letterSpacing: '0.1em',
    color: 'var(--muted)',
    marginRight: 4,
  },
  regulatedPrice: {
    fontFamily: 'var(--font-data)',
    fontSize: '22px',
    fontWeight: 500,
    color: 'var(--cyan)',
  },
  regulatedSuffix: {
    fontFamily: 'var(--font-hud)',
    fontSize: '12px',
    color: 'var(--muted)',
  },
}
