import { useEffect, useState } from 'react'
import type { Station, FuelType } from '../types'
import { openDirections, staticMapUrl } from '../lib/directions'
import { formatPrice } from '../lib/priceColors'

interface DirectionsSheetProps {
  station: Station
  fuelType: FuelType
  onClose: () => void
}

const FUEL_LABELS: Record<FuelType, string> = {
  p93: 'Petrol 93',
  p95: 'Petrol 95',
  d005: 'Diesel 0.05%',
  d0005: 'Diesel 0.005%',
}

export function DirectionsSheet({ station, fuelType, onClose }: DirectionsSheetProps) {
  const price = station.prices?.[fuelType]
  const mapUrl = staticMapUrl(station.latitude, station.longitude)
  const [imgFailed, setImgFailed] = useState(false)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  async function handleDirections(app: 'gmaps' | 'waze') {
    await openDirections(station, app)
  }

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal aria-label="Station directions">
      <div
        style={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up"
      >
        {/* Handle */}
        <div style={styles.handle} />

        {/* Station photo — bleeds to edges */}
        <div style={styles.mapWrapper}>
          {mapUrl && !imgFailed ? (
            <img
              src={mapUrl}
              alt={station.name}
              style={styles.mapImg}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div style={styles.mapPlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span style={styles.mapPlaceholderText}>{station.brand}</span>
            </div>
          )}
          <div style={styles.mapOverlay} />
        </div>

        {/* padded content area */}
        <div style={styles.content}>

        {/* Station info */}
        <div style={styles.info}>
          <div style={styles.stationName}>{station.name}</div>
          <div style={styles.brand}>{station.brand}</div>
          {station.address && (
            <div style={styles.address}>{station.address}</div>
          )}

          <div style={styles.metaRow}>
            {station.distance !== undefined && (
              <div style={styles.metaChip}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {station.distance < 1
                  ? `${Math.round(station.distance * 1000)}m`
                  : `${station.distance.toFixed(1)}km away`}
              </div>
            )}
            {price !== undefined && (
              <div style={styles.metaChip}>
                <span style={{ color: 'var(--muted)', marginRight: 4, fontFamily: 'var(--font-body)', fontSize: '11px' }}>
                  {FUEL_LABELS[fuelType]}
                </span>
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '13px', color: 'var(--green)' }}>
                  {formatPrice(price)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Direction buttons */}
        <div style={styles.buttonsRow}>
          <button
            onClick={() => void handleDirections('gmaps')}
            style={{ ...styles.dirBtn, ...styles.gmapsBtn }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            GOOGLE MAPS
          </button>
          <button
            onClick={() => void handleDirections('waze')}
            style={{ ...styles.dirBtn, ...styles.wazeBtn }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M20.54 6.63C19.58 4.74 17.93 3.3 16 2.55V2a2 2 0 00-4 0v.34C8.14 3.15 5 6.78 5 11c0 2.88 1.21 5.48 3.14 7.33L9 20h6l.86-1.67A9.98 9.98 0 0021 11c0-1.55-.34-3.02-.46-4.37z" />
            </svg>
            WAZE
          </button>
        </div>

        {/* Cancel */}
        <button onClick={onClose} style={styles.cancelBtn}>
          Cancel
        </button>

        </div>{/* end padded content */}
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
  },
  sheet: {
    width: '100%',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border2)',
    borderRadius: '20px 20px 0 0',
    overflow: 'hidden',
    paddingBottom: 'calc(16px + var(--safe-bottom))',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: 'var(--border2)',
    margin: '12px auto 16px',
  },
  mapWrapper: {
    position: 'relative' as const,
    width: '100%',
    height: 140,
    overflow: 'hidden',
    marginBottom: 0,
  },
  mapImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  mapOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    background: 'linear-gradient(to bottom, transparent, var(--surface))',
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'var(--surface2)',
  },
  mapPlaceholderText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '11px',
    letterSpacing: '0.1em',
    color: 'var(--muted)',
  },
  content: {
    padding: '16px 24px 0',
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    marginBottom: 20,
  },
  stationName: {
    fontFamily: 'var(--font-hud)',
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '0.03em',
  },
  brand: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--muted)',
  },
  address: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--muted)',
  },
  metaRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginTop: 4,
  },
  metaChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontFamily: 'var(--font-data)',
    fontSize: '13px',
    color: 'var(--cyan)',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    marginBottom: 20,
  },
  buttonsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 12,
  },
  dirBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    fontFamily: 'var(--font-hud)',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    minHeight: 52,
  },
  gmapsBtn: {
    background: 'rgba(0, 200, 255, 0.12)',
    borderColor: 'var(--cyan)',
    color: 'var(--cyan)',
  },
  wazeBtn: {
    background: 'rgba(255, 107, 0, 0.12)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
  },
  cancelBtn: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--muted)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    cursor: 'pointer',
    minHeight: 48,
  },
}
