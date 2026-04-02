import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useGeolocation } from '../hooks/useGeolocation'
import type { FuelType, Station } from '../types'

const FUEL_OPTIONS: { value: FuelType; label: string; desc: string }[] = [
  { value: 'p93',   label: 'Petrol 93',   desc: 'ULP 93 octane' },
  { value: 'p95',   label: 'Petrol 95',   desc: 'ULP 95 octane' },
  { value: 'd005',  label: 'Diesel 500',  desc: '0.05% sulphur' },
  { value: 'd0005', label: 'Diesel 50',   desc: '0.005% sulphur' },
]

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

/** Haversine distance in km */
function dist(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function ReportPage() {
  const [searchParams] = useSearchParams()
  const { coords } = useGeolocation()

  // Pre-select fuel type from ?fuel= query param (set by StationCard "report" tap)
  const defaultFuel = (searchParams.get('fuel') as FuelType) ?? 'd005'
  const defaultStation = searchParams.get('station') ?? ''

  const [stations, setStations] = useState<Station[]>([])
  const [stationId, setStationId] = useState(defaultStation)
  const [fuelType, setFuelType] = useState<FuelType>(defaultFuel)
  const [priceRand, setPriceRand] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function loadStations() {
      // Use the view that exposes lat/lng from the PostGIS column
      const { data, error } = await supabase
        .from('stations_with_coords')
        .select('id, name, brand, address, latitude, longitude')
      if (!error && data) {
        let rows = data as Station[]
        // Sort nearest-first when location is available
        if (coords) {
          rows = [...rows].sort((a, b) =>
            dist(coords.lat, coords.lng, a.latitude, a.longitude) -
            dist(coords.lat, coords.lng, b.latitude, b.longitude)
          )
        }
        setStations(rows)
      }
    }
    void loadStations()
  }, [coords])

  function validatePrice(raw: string): number | null {
    const val = parseFloat(raw)
    if (isNaN(val) || val < 5 || val > 100) return null
    return Math.round(val * 100)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stationId) { setErrorMsg('Please select a station.'); setSubmitState('error'); return }
    const priceCents = validatePrice(priceRand)
    if (priceCents === null) { setErrorMsg('Enter a valid price between R5 and R100.'); setSubmitState('error'); return }

    setSubmitState('loading')
    setErrorMsg('')

    const { error } = await supabase.from('price_reports').insert([{
      station_id: stationId,
      fuel_type: fuelType as string,
      price_cents: priceCents,
    }])

    if (error) { setErrorMsg(error.message); setSubmitState('error') }
    else { setSubmitState('success') }
  }

  function handleReset() { setSubmitState('idle'); setErrorMsg(''); setPriceRand(''); setStationId('') }

  if (submitState === 'success') {
    return (
      <div className="page" style={styles.page}>
        <div style={styles.successState}>
          <div style={styles.successIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={styles.successTitle}>PRICE REPORTED</h2>
          <p style={styles.successBody}>
            Thanks! Your report helps every driver nearby find the best deal.
          </p>
          <button onClick={handleReset} style={styles.reportAnotherBtn}>Report Another Price</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>REPORT</h1>
        <span style={styles.subtitle}>Saw a different price at the pump? Let the community know.</span>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={styles.form}>

        {/* Fuel type */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>FUEL TYPE</label>
          <div style={styles.fuelGrid}>
            {FUEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFuelType(opt.value)}
                style={{ ...styles.fuelBtn, ...(fuelType === opt.value ? styles.fuelBtnActive : styles.fuelBtnInactive) }}
              >
                <span style={styles.fuelBtnLabel}>{opt.label}</span>
                <span style={styles.fuelBtnDesc}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Station select */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel} htmlFor="station-select">
            STATION {coords ? '— nearest first' : ''}
          </label>
          <div style={styles.selectWrap}>
            <select
              id="station-select"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">Select a station…</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.address ? ` — ${s.address}` : ''}
                </option>
              ))}
            </select>
            <svg style={styles.selectChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Price input */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel} htmlFor="price-input">PRICE YOU SAW ON THE PUMP</label>
          <div style={styles.priceInputWrap}>
            <span style={styles.pricePrefix}>R</span>
            <input
              id="price-input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="5"
              max="100"
              placeholder="25.40"
              value={priceRand}
              onChange={(e) => setPriceRand(e.target.value)}
              style={styles.priceInput}
              required
            />
            <span style={styles.priceSuffix}>/L</span>
          </div>
        </div>

        {/* Error */}
        {submitState === 'error' && errorMsg && (
          <div style={styles.errorBanner}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={styles.errorText}>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitState === 'loading'}
          style={{ ...styles.submitBtn, opacity: submitState === 'loading' ? 0.6 : 1 }}
        >
          {submitState === 'loading' ? 'SUBMITTING…' : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              SUBMIT PRICE
            </>
          )}
        </button>

        <p style={styles.disclaimer}>Reports are anonymous. Prices are verified by the community.</p>
      </form>
    </div>
  )
}

const styles = {
  page: {},
  header: { padding: '20px 20px 8px 68px' },
  title: { fontFamily: 'var(--font-hud)', fontSize: '22px', fontWeight: 900, letterSpacing: '0.12em', color: 'var(--cyan)' },
  subtitle: { fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--muted)', display: 'block', marginTop: 4, lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 24, padding: '20px 16px' },
  fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  fieldLabel: { fontFamily: 'var(--font-hud)', fontSize: '10px', letterSpacing: '0.12em', color: 'var(--cyan)', display: 'block' },
  fuelGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  fuelBtn: {
    padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid',
    cursor: 'pointer', transition: 'all 0.15s ease', minHeight: 52,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', gap: 2,
  },
  fuelBtnActive: { background: 'rgba(0,200,255,0.12)', borderColor: 'var(--cyan)', color: 'var(--cyan)' },
  fuelBtnInactive: { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' },
  fuelBtnLabel: { fontFamily: 'var(--font-hud)', fontSize: '11px', letterSpacing: '0.04em', fontWeight: 700 },
  fuelBtnDesc: { fontFamily: 'var(--font-body)', fontSize: '10px', opacity: 0.7 },
  selectWrap: { position: 'relative' as const },
  select: {
    width: '100%', padding: '14px 40px 14px 14px', background: 'var(--surface)',
    border: '1px solid var(--border2)', borderRadius: 'var(--radius-md)',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px',
    appearance: 'none' as const, WebkitAppearance: 'none' as const, cursor: 'pointer', outline: 'none', minHeight: 48,
  },
  selectChevron: { position: 'absolute' as const, right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' as const },
  priceInputWrap: {
    display: 'flex', alignItems: 'center', background: 'var(--surface)',
    border: '1px solid var(--border2)', borderRadius: 'var(--radius-md)', overflow: 'hidden', minHeight: 56,
  },
  pricePrefix: {
    padding: '0 12px', fontFamily: 'var(--font-hud)', fontSize: '18px', color: 'var(--muted)',
    borderRight: '1px solid var(--border)', alignSelf: 'stretch', display: 'flex', alignItems: 'center',
  },
  priceInput: {
    flex: 1, padding: '14px 12px', background: 'transparent', border: 'none',
    color: 'var(--text)', fontFamily: 'var(--font-data)', fontSize: '22px', fontWeight: 500, outline: 'none', minWidth: 0,
  },
  priceSuffix: {
    padding: '0 14px', fontFamily: 'var(--font-hud)', fontSize: '13px', color: 'var(--muted)',
    borderLeft: '1px solid var(--border)', alignSelf: 'stretch', display: 'flex', alignItems: 'center',
  },
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
    background: 'rgba(255,61,90,0.08)', border: '1px solid rgba(255,61,90,0.25)', borderRadius: 'var(--radius-sm)',
  },
  errorText: { fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--red)' },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '16px', background: 'var(--accent)', border: 'none',
    borderRadius: 'var(--radius-md)', color: '#fff', fontFamily: 'var(--font-hud)',
    fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer',
    transition: 'opacity 0.15s ease', minHeight: 54, boxShadow: '0 0 24px rgba(255,107,0,0.3)',
  },
  disclaimer: { fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--muted)', textAlign: 'center' as const, lineHeight: 1.5 },
  successState: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 32px', gap: 16, textAlign: 'center' as const },
  successIcon: {
    width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,255,136,0.1)',
    border: '2px solid rgba(0,255,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, boxShadow: '0 0 24px rgba(0,255,136,0.15)',
  },
  successTitle: { fontFamily: 'var(--font-hud)', fontSize: '20px', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--green)' },
  successBody: { fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, maxWidth: 280 },
  reportAnotherBtn: {
    marginTop: 16, padding: '14px 24px', background: 'var(--surface)', border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-md)', color: 'var(--cyan)', fontFamily: 'var(--font-hud)',
    fontSize: '12px', letterSpacing: '0.06em', cursor: 'pointer', minHeight: 48,
  },
}
