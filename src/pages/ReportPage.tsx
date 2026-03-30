import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FuelType, Station } from '../types'

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'p93', label: 'Petrol 93' },
  { value: 'p95', label: 'Petrol 95' },
  { value: 'd005', label: 'Diesel 0.05%' },
  { value: 'd0005', label: 'Diesel 0.005%' },
]

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export function ReportPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [stationId, setStationId] = useState('')
  const [fuelType, setFuelType] = useState<FuelType>('d005')
  const [priceRand, setPriceRand] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function loadStations() {
      const { data, error } = await supabase
        .from('stations')
        .select('id, name, brand, address, latitude, longitude, created_at')
        .order('name')
      if (!error && data) {
        const rows = data as Array<{
          id: string
          name: string
          brand: string
          address: string | null
          latitude: number
          longitude: number
          created_at: string
        }>
        setStations(
          rows.map((s) => ({
            id: s.id,
            name: s.name,
            brand: s.brand as Station['brand'],
            address: s.address,
            latitude: s.latitude,
            longitude: s.longitude,
            created_at: s.created_at,
          }))
        )
      }
    }
    void loadStations()
  }, [])

  function validatePrice(raw: string): number | null {
    const val = parseFloat(raw)
    if (isNaN(val) || val <= 0 || val > 100) return null
    return Math.round(val * 100) // convert rand to cents
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stationId) {
      setErrorMsg('Please select a station.')
      setSubmitState('error')
      return
    }

    const priceCents = validatePrice(priceRand)
    if (priceCents === null) {
      setErrorMsg('Enter a valid price between R 0 and R 100.')
      setSubmitState('error')
      return
    }

    setSubmitState('loading')
    setErrorMsg('')

    const { error } = await supabase.from('price_reports').insert([
      {
        station_id: stationId,
        fuel_type: fuelType as string,
        price_cents: priceCents,
      },
    ])

    if (error) {
      setErrorMsg(error.message)
      setSubmitState('error')
    } else {
      setSubmitState('success')
      // Reset form
      setStationId('')
      setPriceRand('')
    }
  }

  function handleReset() {
    setSubmitState('idle')
    setErrorMsg('')
  }

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
            Thanks for keeping FuelWatch accurate! Your report helps drivers find the best deal.
          </p>
          <button onClick={handleReset} style={styles.reportAnotherBtn}>
            Report Another Price
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>REPORT</h1>
        <span style={styles.subtitle}>Help the community by reporting a price</span>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} style={styles.form}>
        {/* Station select */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel} htmlFor="station-select">
            STATION
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
                  {s.name} — {s.brand}
                </option>
              ))}
            </select>
            <svg style={styles.selectChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Fuel type */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>FUEL TYPE</label>
          <div style={styles.fuelTypeGrid}>
            {FUEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFuelType(opt.value)}
                style={{
                  ...styles.fuelTypeBtn,
                  ...(fuelType === opt.value ? styles.fuelTypeBtnActive : styles.fuelTypeBtnInactive),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price input */}
        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel} htmlFor="price-input">
            PRICE (R/L)
          </label>
          <div style={styles.priceInputWrap}>
            <span style={styles.pricePrefix}>R</span>
            <input
              id="price-input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              placeholder="22.34"
              value={priceRand}
              onChange={(e) => setPriceRand(e.target.value)}
              style={styles.priceInput}
              required
            />
            <span style={styles.priceSuffix}>/L</span>
          </div>
          <p style={styles.fieldHint}>Enter the price you see on the pump right now.</p>
        </div>

        {/* Error */}
        {submitState === 'error' && errorMsg && (
          <div style={styles.errorBanner}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={styles.errorText}>{errorMsg}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitState === 'loading'}
          style={{
            ...styles.submitBtn,
            opacity: submitState === 'loading' ? 0.6 : 1,
          }}
        >
          {submitState === 'loading' ? (
            <span style={styles.loadingDots}>SUBMITTING…</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              SUBMIT PRICE
            </>
          )}
        </button>

        <p style={styles.disclaimer}>
          Reports are anonymous and subject to community verification.
        </p>
      </form>
    </div>
  )
}

const styles = {
  page: {},
  header: {
    padding: '20px 20px 8px',
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
    fontSize: '13px',
    color: 'var(--muted)',
    display: 'block',
    marginTop: 4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 24,
    padding: '20px 16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: '10px',
    letterSpacing: '0.12em',
    color: 'var(--cyan)',
    display: 'block',
  },
  selectWrap: {
    position: 'relative' as const,
  },
  select: {
    width: '100%',
    padding: '14px 40px 14px 14px',
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    cursor: 'pointer',
    outline: 'none',
    minHeight: 48,
  },
  selectChevron: {
    position: 'absolute' as const,
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none' as const,
  },
  fuelTypeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  fuelTypeBtn: {
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    fontFamily: 'var(--font-hud)',
    fontSize: '11px',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: 44,
  },
  fuelTypeBtnActive: {
    background: 'rgba(0, 200, 255, 0.12)',
    borderColor: 'var(--cyan)',
    color: 'var(--cyan)',
  },
  fuelTypeBtnInactive: {
    background: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--muted)',
  },
  priceInputWrap: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    minHeight: 56,
  },
  pricePrefix: {
    padding: '0 12px',
    fontFamily: 'var(--font-hud)',
    fontSize: '18px',
    color: 'var(--muted)',
    borderRight: '1px solid var(--border)',
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    padding: '14px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text)',
    fontFamily: 'var(--font-data)',
    fontSize: '22px',
    fontWeight: 500,
    outline: 'none',
    minWidth: 0,
  },
  priceSuffix: {
    padding: '0 14px',
    fontFamily: 'var(--font-hud)',
    fontSize: '13px',
    color: 'var(--muted)',
    borderLeft: '1px solid var(--border)',
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
  },
  fieldHint: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    background: 'rgba(255, 61, 90, 0.08)',
    border: '1px solid rgba(255, 61, 90, 0.25)',
    borderRadius: 'var(--radius-sm)',
  },
  errorText: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    color: 'var(--red)',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '16px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#fff',
    fontFamily: 'var(--font-hud)',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    minHeight: 54,
    boxShadow: '0 0 24px rgba(255, 107, 0, 0.3)',
  },
  loadingDots: {
    fontFamily: 'var(--font-hud)',
    fontSize: '14px',
    letterSpacing: '0.1em',
  },
  disclaimer: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  // Success state
  successState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px 32px',
    gap: 16,
    textAlign: 'center' as const,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(0, 255, 136, 0.1)',
    border: '2px solid rgba(0, 255, 136, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    boxShadow: '0 0 24px rgba(0, 255, 136, 0.15)',
  },
  successTitle: {
    fontFamily: 'var(--font-hud)',
    fontSize: '20px',
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: 'var(--green)',
  },
  successBody: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    color: 'var(--muted)',
    lineHeight: 1.6,
    maxWidth: 280,
  },
  reportAnotherBtn: {
    marginTop: 16,
    padding: '14px 24px',
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--cyan)',
    fontFamily: 'var(--font-hud)',
    fontSize: '12px',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    minHeight: 48,
  },
}
