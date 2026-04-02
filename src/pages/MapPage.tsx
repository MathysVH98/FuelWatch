import { useEffect, useRef, useState, useMemo } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useStations } from '../hooks/useStations'
import { useDmrePrices } from '../hooks/useDmrePrices'
import { DirectionsSheet } from '../components/DirectionsSheet'
import { priceColor } from '../lib/scoring'
import type { FuelType, Station } from '../types'

const DEFAULT_FUEL: FuelType = 'd005'
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#060A12' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#060A12' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A6080' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#0D1520' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#00C8FF11' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#4A6080' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1A2535' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#00C8FF22' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#00C8FF88' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020508' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1A3050' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1A2535' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#00C8FF66' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0A1020' }] },
]

let mapsLoading = false
let mapsLoaded = false
const mapsCallbacks: (() => void)[] = []

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (mapsLoaded) { resolve(); return }
    mapsCallbacks.push(resolve)
    if (mapsLoading) return
    mapsLoading = true
    ;(window as unknown as Record<string, unknown>).__googleMapsInit = () => {
      mapsLoaded = true
      mapsCallbacks.forEach((cb) => cb())
      mapsCallbacks.length = 0
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsInit&loading=async`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  })
}

export function MapPage() {
  const [fuelType] = useState<FuelType>(DEFAULT_FUEL)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [mapsReady, setMapsReady] = useState(mapsLoaded)

  const { coords } = useGeolocation()
  const { stations } = useStations(coords, fuelType, 'nearest')
  const { prices: dmrePrices } = useDmrePrices('inland')

  const stationsWithDmre = useMemo(() => {
    const dmrePrice = dmrePrices[fuelType]
    if (dmrePrice === undefined) return stations
    return stations.map((s) => ({
      ...s,
      prices: { ...s.prices, [fuelType]: s.prices?.[fuelType] ?? dmrePrice },
    }))
  }, [stations, fuelType, dmrePrices])

  const allPricesArr = useMemo(
    () => stationsWithDmre.map((s) => s.prices?.[fuelType]).filter((p): p is number => p !== undefined),
    [stationsWithDmre, fuelType],
  )

  // Refs
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const userMarkerRef = useRef<google.maps.Marker | null>(null)
  const hasPannedRef = useRef(false)

  // Load Maps SDK
  useEffect(() => {
    if (!MAPS_KEY) return
    void loadGoogleMaps(MAPS_KEY).then(() => setMapsReady(true))
  }, [])

  // Initialize map — runs after SDK is ready AND div is in DOM
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapRef.current) return

    mapRef.current = new google.maps.Map(mapDivRef.current, {
      center: { lat: -26.2041, lng: 28.0473 }, // Johannesburg default
      zoom: 13,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      gestureHandling: 'greedy',
      backgroundColor: '#060A12',
    })
  }, [mapsReady])

  // Update station markers
  useEffect(() => {
    if (!mapRef.current || !mapsReady) return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    stationsWithDmre.forEach((station) => {
      const price = station.prices?.[fuelType]
      const color = price !== undefined ? priceColor(price, allPricesArr) : '#4A6080'

      const marker = new google.maps.Marker({
        position: { lat: station.latitude, lng: station.longitude },
        map: mapRef.current!,
        title: `${station.name} — ${station.brand}`,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#060A12',
          strokeWeight: 1.5,
          scale: 1.6,
          anchor: new google.maps.Point(12, 22),
        },
      })

      marker.addListener('click', () => setSelectedStation(station))
      markersRef.current.push(marker)
    })
  }, [mapsReady, stationsWithDmre, fuelType, allPricesArr])

  // User location marker + pan (only pan once on first fix)
  useEffect(() => {
    if (!mapRef.current || !mapsReady || !coords) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition({ lat: coords.lat, lng: coords.lng })
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position: { lat: coords.lat, lng: coords.lng },
        map: mapRef.current,
        title: 'Your location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#00C8FF',
          fillOpacity: 1,
          strokeColor: '#060A12',
          strokeWeight: 3,
        },
        zIndex: 999,
      })
    }

    if (!hasPannedRef.current) {
      mapRef.current.panTo({ lat: coords.lat, lng: coords.lng })
      hasPannedRef.current = true
    }
  }, [mapsReady, coords])

  return (
    <div className="page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>MAP</h1>
        <span style={styles.subtitle}>Station Locations</span>
      </div>

      {/* Map area — always mounted so mapDivRef is always available */}
      <div style={styles.mapArea}>
        {/* Map div — always in DOM */}
        <div ref={mapDivRef} style={styles.mapDiv} />

        {/* Overlays */}
        {!MAPS_KEY && (
          <div style={styles.overlay}>
            <p style={styles.overlayText}>Google Maps API key not configured.</p>
          </div>
        )}
        {MAPS_KEY && !mapsReady && (
          <div style={styles.overlay}>
            <p style={styles.overlayText}>LOADING MAP...</p>
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

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
  },
  header: {
    padding: '20px 20px 12px 68px',
    flexShrink: 0,
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
  mapArea: {
    flex: 1,
    position: 'relative' as const,
    margin: '0 16px',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    minHeight: 320,
    border: '1px solid var(--border)',
    background: '#060A12',
  },
  mapDiv: {
    position: 'absolute' as const,
    inset: 0,
  },
  overlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#060A12',
    zIndex: 1,
  },
  overlayText: {
    fontFamily: 'var(--font-hud)',
    fontSize: '12px',
    letterSpacing: '0.15em',
    color: 'var(--muted)',
  },
  legend: {
    display: 'flex',
    gap: 16,
    padding: '12px 20px',
    flexWrap: 'wrap' as const,
    flexShrink: 0,
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
