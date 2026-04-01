import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FuelType, PriceZone } from '../types'

// ── Types ──────────────────────────────────────────────────────────────────────
interface PriceEntry {
  fuel_type: FuelType
  zone: PriceZone
  price_cents: number
  effective_date: string
}

const FUEL_LABELS: Record<FuelType, string> = {
  p93:   'Petrol 93 (ULP 93)',
  p95:   'Petrol 95 (ULP 95)',
  d005:  'Diesel 500ppm (0.05%)',
  d0005: 'Diesel 50ppm (0.005%)',
}

const FUEL_ORDER: FuelType[] = ['p93', 'p95', 'd005', 'd0005']
const ZONES: PriceZone[] = ['inland', 'coastal']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AdminPricesPage() {
  const [effectiveDate, setEffectiveDate] = useState(today())
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Pre-fill with latest prices from DB
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('dmre_prices')
        .select('fuel_type, zone, price_cents, effective_date')
        .order('effective_date', { ascending: false })

      if (data?.length) {
        const seen = new Set<string>()
        const map: Record<string, string> = {}
        let latestDate = ''
        for (const row of data as PriceEntry[]) {
          const key = `${row.fuel_type}_${row.zone}`
          if (!seen.has(key)) {
            seen.add(key)
            map[key] = (row.price_cents / 100).toFixed(2)
            if (!latestDate) latestDate = row.effective_date
          }
        }
        setPrices(map)
        if (latestDate) setEffectiveDate(latestDate)
      }
      setLoading(false)
    }
    void load()
  }, [])

  function key(fuel: FuelType, zone: PriceZone) {
    return `${fuel}_${zone}`
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const rows: PriceEntry[] = []
    for (const fuel of FUEL_ORDER) {
      for (const zone of ZONES) {
        const val = parseFloat(prices[key(fuel, zone)] ?? '')
        if (!isNaN(val) && val > 0) {
          rows.push({
            fuel_type: fuel,
            zone,
            price_cents: Math.round(val * 100),
            effective_date: effectiveDate,
          })
        }
      }
    }

    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'No valid prices to save.' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('dmre_prices')
      .upsert(rows, { onConflict: 'fuel_type,zone,effective_date' })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `${rows.length} prices saved — all users updated in real time.` })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div style={s.page}>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Loading current prices…
        </p>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>FUEL<span style={{ color: 'var(--accent)' }}>WATCH</span></h1>
        <p style={s.subtitle}>DMRE Price Admin</p>
      </div>

      <p style={s.hint}>
        Update once a month when DMRE announces new prices.
        Source: <a href="https://www.aa.co.za/fuel-price/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)' }}>aa.co.za/fuel-price</a>
      </p>

      {/* Effective date */}
      <div style={s.field}>
        <label style={s.label}>EFFECTIVE DATE</label>
        <input
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          style={s.input}
        />
      </div>

      {/* Price grid */}
      {FUEL_ORDER.map((fuel) => (
        <div key={fuel} style={s.fuelBlock}>
          <div style={s.fuelLabel}>{FUEL_LABELS[fuel]}</div>
          <div style={s.zoneRow}>
            {ZONES.map((zone) => (
              <div key={zone} style={s.zoneField}>
                <label style={s.zoneLabel}>{zone.toUpperCase()}</label>
                <div style={s.inputWrapper}>
                  <span style={s.prefix}>R</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={prices[key(fuel, zone)] ?? ''}
                    onChange={(e) =>
                      setPrices((prev) => ({ ...prev, [key(fuel, zone)]: e.target.value }))
                    }
                    style={s.priceInput}
                  />
                  <span style={s.suffix}>/L</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Feedback */}
      {message && (
        <div style={{
          ...s.message,
          background: message.type === 'success'
            ? 'rgba(0,255,136,0.08)' : 'rgba(255,80,80,0.08)',
          borderColor: message.type === 'success'
            ? 'rgba(0,255,136,0.3)' : 'rgba(255,80,80,0.3)',
          color: message.type === 'success' ? 'var(--green)' : '#ff5050',
        }}>
          {message.text}
        </div>
      )}

      {/* Save */}
      <button onClick={() => void handleSave()} disabled={saving} style={s.saveBtn}>
        {saving ? 'SAVING…' : 'SAVE & PUBLISH PRICES'}
      </button>

      <p style={s.footer}>
        Changes are pushed to all users instantly via Supabase Realtime.
      </p>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100svh',
    background: 'var(--bg)',
    padding: '32px 20px 48px',
    maxWidth: 480,
    margin: '0 auto',
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontFamily: 'var(--font-hud)',
    fontSize: 24,
    fontWeight: 900,
    color: 'var(--cyan)',
    letterSpacing: '0.1em',
    margin: 0,
  },
  subtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--muted)',
    margin: '4px 0 20px',
    letterSpacing: '0.05em',
  },
  hint: {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: 'var(--muted)',
    lineHeight: 1.6,
    marginBottom: 24,
    padding: '10px 14px',
    background: 'var(--surface)',
    borderRadius: 8,
    border: '1px solid var(--border)',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'var(--font-hud)',
    fontSize: 10,
    letterSpacing: '0.12em',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: 8,
    color: 'var(--text)',
    fontFamily: 'var(--font-data)',
    fontSize: 14,
    boxSizing: 'border-box' as const,
  },
  fuelBlock: {
    marginBottom: 20,
    padding: '14px 16px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
  },
  fuelLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: 'var(--cyan)',
    marginBottom: 12,
  },
  zoneRow: {
    display: 'flex',
    gap: 12,
  },
  zoneField: {
    flex: 1,
  },
  zoneLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: 9,
    letterSpacing: '0.1em',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: 6,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--surface2)',
    border: '1px solid var(--border2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  prefix: {
    fontFamily: 'var(--font-hud)',
    fontSize: 13,
    color: 'var(--muted)',
    padding: '0 6px 0 10px',
  },
  priceInput: {
    flex: 1,
    padding: '10px 0',
    background: 'transparent',
    border: 'none',
    color: 'var(--text)',
    fontFamily: 'var(--font-data)',
    fontSize: 15,
    outline: 'none',
    width: '100%',
    minWidth: 0,
  },
  suffix: {
    fontFamily: 'var(--font-hud)',
    fontSize: 11,
    color: 'var(--muted)',
    paddingRight: 8,
  },
  message: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  saveBtn: {
    width: '100%',
    padding: '16px',
    background: 'var(--cyan)',
    border: 'none',
    borderRadius: 10,
    color: 'var(--bg)',
    fontFamily: 'var(--font-hud)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    marginBottom: 16,
  },
  footer: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--muted)',
    textAlign: 'center' as const,
    lineHeight: 1.6,
  },
}
