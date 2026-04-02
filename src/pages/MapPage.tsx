/**
 * MapPage — Fuel station map view.
 *
 * TODO: Integrate Google Maps SDK (Maps JavaScript API or @capacitor-community/google-maps)
 *       once API keys are available. Replace the grid placeholder below with a real map.
 *
 * Current implementation: colour-coded pin grid derived from lat/lng bounds of loaded stations.
 */

import { useState } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useStations } from '../hooks/useStations'
import { useFuelPrices } from '../hooks/useFuelPrices'
import { DirectionsSheet } from '../components/DirectionsSheet'
import { priceColor } from '../lib/scoring'
import type { FuelType, Station } from '../types'

const DEFAULT_FUEL: FuelType = 'd005'

export function MapPage() {
  const [fuelType] = useState<FuelType>(DEFAULT_FUEL)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const { coords } = useGeolocation()
  const { stations } = useStations(coords, fuelType, 'nearest')
  useFuelPrices(stations, fuelType)

  // Compute bounding box for pin placement
  const lats = stations.map((s) => s.latitude)
  const lngs = stations.map((s) => s.longitude)
  const minLat = lats.length ? Math.min(...lats) : -26.5
  const maxLat = lats.length ? Math.max(...lats) : -25.5
  const minLng = lngs.length ? Math.min(...lngs) : 27.5
  const maxLng = lngs.length ? Math.max(...lngs) : 28.5
  const latRange = maxLat - minLat || 1
  const lngRange = maxLng - minLng || 1

  function pinPosition(station: Station): { top: string; left: string } {
    const top = ((maxLat - station.latitude) / latRange) * 100
    const left = ((station.longitude - minLng) / lngRange) * 100
    return {
      top: `${Math.min(Math.max(top, 2), 96)}%`,
      left: `${Math.min(Math.max(left, 2), 96)}%`,
    }
  }

  const allPrices = stations
    .map((s) => s.prices?.[fuelType])
    .filter((p): p is number => p !== undefined)

  return (
    <div className="page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>MAP</h1>
        <span style={styles.subtitle}>Station Locations</span>
      </div>

      {/* TODO banner */}
      <div style={styles.todoBanner}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={styles.todoText}>
          TODO: Replace with Google Maps SDK integration. Showing placeholder pin grid.
        </span>
      </div>

      {/* Map area */}
      <div style={styles.mapArea}>
        {/* Grid lines (decorative) */}
        <GridLines />

        {/* Station pins */}
        {stations.map((station) => {
          const pos = pinPosition(station)
          const price = station.prices?.[fuelType]
          const color = price !== undefined ? priceColor(price, allPrices) : '#4A6080'

          return (
            <button
              key={station.id}
              onClick={() => setSelectedStation(station)}
              style={{
                ...styles.pin,
                top: pos.top,
                left: pos.left,
                borderColor: color,
                background: `${color}22`,
              }}
              aria-label={`${station.name} pin`}
            >
              <div style={{ ...styles.pinDot, background: color }} />
              <span style={{ ...styles.pinLabel, color }}>{station.brand}</span>
            </button>
          )
        })}

        {/* User location dot */}
        {coords && stations.length > 0 && (
          <div
            style={{
              ...styles.userDot,
              top: `${Math.min(Math.max(((maxLat - coords.lat) / latRange) * 100, 2), 96)}%`,
              left: `${Math.min(Math.max(((coords.lng - minLng) / lngRange) * 100, 2), 96)}%`,
            }}
          />
        )}

        {stations.length === 0 && (
          <div style={styles.emptyMap}>
            <p style={{ fontFamily: 'var(--font-hud)', color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em' }}>
              NO STATIONS LOADED
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {[
          { color: 'var(--green)', label: 'Cheapest' },
          { color: 'var(--yellow)', label: 'Mid-range' },
          { color: 'var(--red)', label: 'Priciest' },
          { color: 'var(--cyan)', label: 'You' },
        ].map(({ color, label }) => (
          <div key={label} style={styles.legendItem}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={styles.legendLabel}>{label}</span>
          </div>
        ))}
      </div>

      {selectedStation && (
        <DirectionsSheet
          station={selectedStation}
          fuelType={fuelType}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </div>
  )
}

function GridLines() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      preserveAspectRatio="none"
    >
      {[20, 40, 60, 80].map((pct) => (
        <g key={pct}>
          <line x1={`${pct}%`} y1="0" x2={`${pct}%`} y2="100%" stroke="rgba(0,200,255,0.06)" strokeWidth="1" />
          <line x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`} stroke="rgba(0,200,255,0.06)" strokeWidth="1" />
        </g>
      ))}
    </svg>
  )
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '20px 20px 12px 68px',
  },
  title: {
    fontFamily: 'var(--font-hud)',
    fontSize: '22px',
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: 'var(--cyan)',
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--muted)',
  },
  todoBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 16px',
    background: 'rgba(0, 200, 255, 0.04)',
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
  },
  todoText: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    fontStyle: 'italic',
  },
  mapArea: {
    flex: 1,
    position: 'relative' as const,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    margin: '12px 16px 0',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    minHeight: 320,
  },
  pin: {
    position: 'absolute' as const,
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    transition: 'transform 0.15s ease',
    zIndex: 10,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  pinLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: '8px',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  userDot: {
    position: 'absolute' as const,
    transform: 'translate(-50%, -50%)',
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: 'var(--cyan)',
    border: '2px solid var(--bg)',
    boxShadow: '0 0 8px var(--cyan)',
    zIndex: 20,
  },
  emptyMap: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    display: 'flex',
    gap: 16,
    padding: '12px 20px',
    flexWrap: 'wrap' as const,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
  },
}
