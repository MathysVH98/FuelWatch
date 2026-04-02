import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Station, FuelType } from '../types'
import { formatPrice } from '../lib/priceColors'

interface StationCardProps {
  station: Station
  fuelType: FuelType
  priceColor: string
  rank: number
  onTap: () => void
  isDmre?: boolean
}

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

const BRAND_COLORS: Record<string, string> = {
  BP: '#00AA44',
  SASOL: '#FF6B00',
  ENGEN: '#E8001A',
  TOTAL: '#E8001A',
  SHELL: '#FFD100',
  CALTEX: '#003087',
}

function streetViewUrl(lat: number, lng: number): string | null {
  if (!GMAPS_KEY) return null
  const params = new URLSearchParams({
    size: '120x90',
    location: `${lat},${lng}`,
    fov: '90',
    pitch: '0',
    return_error_codes: 'true',
    key: GMAPS_KEY,
  })
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`
}

function StationThumbnail({ station }: { station: Station }) {
  const [imgFailed, setImgFailed] = useState(false)
  const url = streetViewUrl(station.latitude, station.longitude)
  const brandColor = BRAND_COLORS[station.brand] ?? '#4A6080'

  if (!url || imgFailed) {
    // Brand-coloured placeholder with fuel pump icon
    return (
      <div style={{ ...styles.thumbnail, background: `${brandColor}18`, border: `1.5px solid ${brandColor}40` }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 22V8a2 2 0 012-2h8a2 2 0 012 2v14" />
          <path d="M3 22h12" />
          <path d="M15 8h2a2 2 0 012 2v2" />
          <path d="M19 12v4a2 2 0 01-2 2h-2" />
          <path d="M7 14h4" />
          <path d="M7 10h4" />
        </svg>
        <span style={{ ...styles.thumbnailBrandText, color: brandColor }}>
          {station.brand}
        </span>
      </div>
    )
  }

  return (
    <div style={styles.thumbnail}>
      <img
        src={url}
        alt={station.name}
        onError={() => setImgFailed(true)}
        style={styles.thumbnailImg}
      />
      {/* Brand overlay badge */}
      <div style={{ ...styles.thumbnailBadge, background: `${brandColor}EE` }}>
        <span style={styles.thumbnailBadgeText}>{station.brand}</span>
      </div>
    </div>
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
    <div
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTap() }}
      style={styles.card}
      aria-label={`${station.name} — tap for directions`}
    >
      {/* Thumbnail */}
      <StationThumbnail station={station} />

      {/* Main content */}
      <div style={styles.body}>
        {/* Top: name + price */}
        <div style={styles.topRow}>
          <span style={styles.name}>{station.name}</span>
          <div style={{ ...styles.pricePill, borderColor: `${priceColor}44`, background: `${priceColor}14` }}>
            {isDmre && <span style={styles.dmreMicro}>DMRE</span>}
            <span style={{ ...styles.priceText, color: priceColor }}>
              {price !== undefined ? formatPrice(price) : '—'}
            </span>
          </div>
        </div>

        {/* Mid: address */}
        {station.address && (
          <span style={styles.address}>{station.address}</span>
        )}

        {/* Bottom: distance + rank + report */}
        <div style={styles.bottomRow}>
          <div style={styles.metaLeft}>
            <span style={styles.rankChip}>#{rank}</span>
            {station.distance !== undefined && (
              <span style={styles.distance}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {station.distance < 1
                  ? `${Math.round(station.distance * 1000)}m`
                  : `${station.distance.toFixed(1)}km`}
              </span>
            )}
          </div>
          <button onClick={handleReport} style={styles.reportBtn} aria-label="Report a different price">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {isDmre ? 'different price?' : 'update'}
          </button>
        </div>
      </div>

      {/* Chevron */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" strokeWidth="2" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}

const styles = {
  card: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px 10px 10px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background 0.15s ease',
    textAlign: 'left' as const,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative' as const,
    background: 'var(--surface2)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  thumbnailBrandText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '8px',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  thumbnailBadge: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    padding: '2px 4px',
    display: 'flex',
    justifyContent: 'center',
  },
  thumbnailBadgeText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '8px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#fff',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    minWidth: 0,
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontFamily: 'var(--font-hud)',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: 'var(--text)',
    flex: 1,
    minWidth: 0,
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
  address: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 2,
  },
  metaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  rankChip: {
    fontFamily: 'var(--font-data)',
    fontSize: '10px',
    color: 'var(--muted)',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '1px 5px',
  },
  distance: {
    fontFamily: 'var(--font-data)',
    fontSize: '11px',
    color: 'var(--cyan)',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
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
    flexShrink: 0,
  },
}
