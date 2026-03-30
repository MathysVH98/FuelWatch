import { useState, useMemo } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useStations } from '../hooks/useStations'
import { useFuelPrices } from '../hooks/useFuelPrices'
import { useDmrePrices } from '../hooks/useDmrePrices'
import { useAuthContext } from '../context/AuthContext'
import { useAiChat, buildChatContext } from '../hooks/useAiChat'
import { HeroCard } from '../components/HeroCard'
import { FuelTabs } from '../components/FuelTabs'
import { PriceBand } from '../components/PriceBand'
import { StationCard } from '../components/StationCard'
import { DirectionsSheet } from '../components/DirectionsSheet'
import { AiChat } from '../components/AiChat'
import type { FuelType, SortMode, Station, PriceZone } from '../types'

const PETROL_TYPES: FuelType[] = ['p93', 'p95']
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'best_deal', label: 'Best Deal' },
  { value: 'price', label: 'Price' },
  { value: 'nearest', label: 'Nearest' },
]

export function StationsPage() {
  const { user } = useAuthContext()

  const [fuelType, setFuelType] = useState<FuelType>('d005')
  const [sortMode, setSortMode] = useState<SortMode>('best_deal')
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  // Default zone from user profile, fallback to inland
  const [zone, setZone] = useState<PriceZone>(user?.preferredZone ?? 'inland')

  const { coords } = useGeolocation()
  const { stations, loading, error } = useStations(coords, fuelType, sortMode)
  const { prices: dmrePrices, effectiveDate, loading: dmreLoading } = useDmrePrices(zone)

  const isRegulated = PETROL_TYPES.includes(fuelType)

  // For regulated fuels, inject the DMRE price into every station that has no
  // user-reported price yet. This means the list is populated from the first load.
  const stationsWithDmre: Station[] = useMemo(() => {
    const dmrePrice = dmrePrices[fuelType]
    if (!isRegulated || dmrePrice === undefined) return stations
    return stations.map((s) => ({
      ...s,
      prices: {
        ...s.prices,
        [fuelType]: s.prices?.[fuelType] ?? dmrePrice,
      },
    }))
  }, [stations, fuelType, isRegulated, dmrePrices])

  // A station's displayed price is "DMRE official" when:
  // – it's a regulated fuel, AND
  // – the station has no user-submitted price_report (price equals the injected DMRE value)
  function isDmrePrice(station: Station): boolean {
    if (!isRegulated) return false
    const dmrePrice = dmrePrices[fuelType]
    if (dmrePrice === undefined) return false
    // If the station had no user report, we filled in the DMRE price above
    return (station.prices?.[fuelType] ?? null) === dmrePrice
  }

  const { cheapest, average, priciest, colorFor } = useFuelPrices(stationsWithDmre, fuelType)
  const bestStation = stationsWithDmre.find((s) => s.prices?.[fuelType] !== undefined) ?? null

  // AI chat
  const { messages: chatMessages, isLoading: chatLoading, sendMessage, clearMessages } = useAiChat()
  const chatContext = useMemo(
    () =>
      buildChatContext(
        fuelType,
        zone,
        stationsWithDmre,
        dmrePrices[fuelType],
        cheapest,
        average,
        priciest,
        effectiveDate,
      ),
    [fuelType, zone, stationsWithDmre, dmrePrices, cheapest, average, priciest, effectiveDate],
  )

  return (
    <div className="page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.appTitle}>FuelWatch</h1>
          <span style={styles.appSub}>South Africa</span>
        </div>
        <div style={styles.headerRight}>
          {/* Zone toggle */}
          <div style={styles.zoneToggle}>
            {(['inland', 'coastal'] as PriceZone[]).map((z) => (
              <button
                key={z}
                onClick={() => setZone(z)}
                style={{
                  ...styles.zoneBtn,
                  ...(zone === z ? styles.zoneBtnActive : styles.zoneBtnInactive),
                }}
              >
                {z === 'inland' ? 'INLAND' : 'COAST'}
              </button>
            ))}
          </div>
          <div style={styles.liveBadge}>
            <span style={styles.liveDot} />
            <span style={styles.liveText}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Fuel Tabs */}
      <div style={styles.tabsSection}>
        <FuelTabs selected={fuelType} onChange={setFuelType} />
      </div>

      {/* Regulated / DMRE info banner */}
      {isRegulated && (
        <div style={styles.regulatedBanner}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={styles.regulatedText}>
            Petrol is DMRE-regulated — price is fixed across all stations in the{' '}
            <strong style={{ color: 'var(--cyan)' }}>{zone}</strong> zone.
            {!dmreLoading && effectiveDate && (
              <span style={styles.effectiveDateInline}>
                {' '}Updated{' '}
                {new Date(effectiveDate).toLocaleDateString('en-ZA', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            )}
          </span>
        </div>
      )}

      <div style={styles.content}>
        {/* Hero card */}
        <HeroCard
          station={bestStation}
          fuelType={fuelType}
          onTap={() => bestStation && setSelectedStation(bestStation)}
        />

        {/* Price band */}
        <PriceBand
          cheapest={cheapest}
          average={average}
          priciest={priciest}
          isRegulated={isRegulated}
          dmrePrice={isRegulated ? (dmrePrices[fuelType] ?? null) : null}
          dmreMax={!isRegulated ? (dmrePrices[fuelType] ?? null) : null}
          effectiveDate={effectiveDate}
          zone={zone}
        />

        {/* Sort bar */}
        <div style={styles.sortRow}>
          <span style={styles.sortLabel}>SORT BY</span>
          <div style={styles.sortButtons}>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortMode(opt.value)}
                style={{
                  ...styles.sortBtn,
                  ...(sortMode === opt.value ? styles.sortBtnActive : styles.sortBtnInactive),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Station list */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} />
        ) : stationsWithDmre.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={styles.stationList}>
            {stationsWithDmre.map((station, idx) => (
              <StationCard
                key={station.id}
                station={station}
                fuelType={fuelType}
                priceColor={
                  station.prices?.[fuelType] !== undefined
                    ? colorFor(station.prices[fuelType]!)
                    : '#4A6080'
                }
                rank={idx + 1}
                isDmre={isDmrePrice(station)}
                onTap={() => setSelectedStation(station)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Directions sheet */}
      {selectedStation && (
        <DirectionsSheet
          station={selectedStation}
          fuelType={fuelType}
          onClose={() => setSelectedStation(null)}
        />
      )}

      {/* AI chat */}
      <AiChat
        messages={chatMessages}
        isLoading={chatLoading}
        onSend={(text) => sendMessage(text, chatContext)}
        onClear={clearMessages}
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            height: 72,
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            animation: 'pulse-glow 1.5s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--red)', fontSize: '14px' }}>
        {message}
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-hud)', color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em' }}>
        NO STATIONS FOUND
      </p>
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--muted)', fontSize: '12px', marginTop: 8 }}>
        Be the first to report a diesel price near you.
      </p>
    </div>
  )
}

const styles = {
  page: {
    overflowX: 'hidden' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 20px 12px',
    gap: 12,
  },
  appTitle: {
    fontFamily: 'var(--font-hud)',
    fontSize: '22px',
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: 'var(--cyan)',
  },
  appSub: {
    fontFamily: 'var(--font-body)',
    fontSize: '11px',
    color: 'var(--muted)',
    display: 'block',
    marginTop: 2,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  zoneToggle: {
    display: 'flex',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  zoneBtn: {
    padding: '4px 10px',
    borderRadius: 16,
    border: 'none',
    fontFamily: 'var(--font-hud)',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: 28,
  },
  zoneBtnActive: {
    background: 'var(--cyan)',
    color: 'var(--bg)',
  },
  zoneBtnInactive: {
    background: 'transparent',
    color: 'var(--muted)',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    background: 'rgba(0, 255, 136, 0.08)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--green)',
    animation: 'pulse-glow 1.5s ease-in-out infinite',
    display: 'inline-block',
  },
  liveText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '9px',
    letterSpacing: '0.15em',
    color: 'var(--green)',
  },
  tabsSection: {
    paddingBottom: 16,
  },
  regulatedBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 16px',
    background: 'rgba(0, 200, 255, 0.04)',
    borderTop: '1px solid rgba(0, 200, 255, 0.1)',
    borderBottom: '1px solid rgba(0, 200, 255, 0.1)',
    margin: '0 0 4px',
  },
  regulatedText: {
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
  effectiveDateInline: {
    fontFamily: 'var(--font-data)',
    fontSize: '11px',
    color: 'var(--cyan)',
    opacity: 0.7,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    padding: '8px 16px 24px',
  },
  sortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: '9px',
    letterSpacing: '0.12em',
    color: 'var(--muted)',
    flexShrink: 0,
  },
  sortButtons: {
    display: 'flex',
    gap: 6,
    flex: 1,
  },
  sortBtn: {
    flex: 1,
    padding: '8px 4px',
    borderRadius: 6,
    border: '1px solid',
    fontFamily: 'var(--font-hud)',
    fontSize: '10px',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minHeight: 36,
  },
  sortBtnActive: {
    background: 'rgba(0, 200, 255, 0.12)',
    borderColor: 'var(--cyan)',
    color: 'var(--cyan)',
  },
  sortBtnInactive: {
    background: 'transparent',
    borderColor: 'var(--border)',
    color: 'var(--muted)',
  },
  stationList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
}
