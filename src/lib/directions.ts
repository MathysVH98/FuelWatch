import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import type { Station } from '../types'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

// ── Coordinate formatting ─────────────────────────────────────────────────────
function coord(n: number): string {
  return n.toFixed(6)
}

// ── URL builders ──────────────────────────────────────────────────────────────

// Use station name + address as the destination query so Google resolves the
// actual business rather than reverse-geocoding raw coords to a nearby street.
// Falls back to coordinates when address is missing.
function gmapsUrl(station: Station): string {
  const destination = station.address
    ? encodeURIComponent(`${station.name}, ${station.address}`)
    : `${coord(station.latitude)},${coord(station.longitude)}`

  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${destination}` +
    '&travelmode=driving' +
    '&dir_action=navigate'
  )
}

// ── Street View preview ───────────────────────────────────────────────────────
// Returns a Street View Static API URL showing the actual station.
// return_error_codes=true → 404 instead of grey placeholder when no imagery,
// so the caller can handle it with an onError fallback.
export function staticMapUrl(lat: number, lng: number): string | null {
  if (!GMAPS_KEY) return null
  const params = new URLSearchParams({
    size: '600x240',
    scale: '2',
    location: `${coord(lat)},${coord(lng)}`,
    fov: '80',
    pitch: '5',
    return_error_codes: 'true',
    key: GMAPS_KEY,
  })
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`
}

function wazeUrl(station: Station): string {
  // Waze supports a search query — use name + address for accuracy
  const query = station.address
    ? encodeURIComponent(`${station.name}, ${station.address}`)
    : encodeURIComponent(station.name)
  return `https://waze.com/ul?q=${query}&navigate=yes`
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function openDirections(
  station: Station,
  app: 'gmaps' | 'waze'
): Promise<void> {
  const url = app === 'gmaps' ? gmapsUrl(station) : wazeUrl(station)

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
