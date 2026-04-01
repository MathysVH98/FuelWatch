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

// ── Static map preview ────────────────────────────────────────────────────────
// Returns a Maps Static API URL for an in-app map thumbnail.
// scale=2 → retina/HDPI, size=600x240 rendered at 300x120 CSS pixels.
export function staticMapUrl(lat: number, lng: number): string | null {
  if (!GMAPS_KEY) return null
  const c = `${coord(lat)},${coord(lng)}`
  return (
    'https://maps.googleapis.com/maps/api/staticmap' +
    `?center=${c}` +
    '&zoom=15' +
    '&size=600x240' +
    '&scale=2' +
    '&style=element:geometry|color:0x0B1220' +
    '&style=element:labels.text.fill|color:0x4A6080' +
    '&style=feature:road|element:geometry|color:0x111D30' +
    '&style=feature:road|element:geometry.stroke|color:0x1a2a45' +
    '&style=feature:water|element:geometry|color:0x060A12' +
    `&markers=color:0x00C8FF|label:F|${c}` +
    `&key=${GMAPS_KEY}`
  )
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
