import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import type { Station } from '../types'

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined

// ── Coordinate formatting ─────────────────────────────────────────────────────
// Cap at 6 decimal places (~0.1 m precision) to eliminate floating-point noise
// such as -26.107600000000001 which can confuse some map parsers.
function coord(n: number): string {
  return n.toFixed(6)
}

// ── URL builders ──────────────────────────────────────────────────────────────

// dir_action=navigate  → skips the route-overview screen and launches
//                        turn-by-turn navigation immediately.
// travelmode=driving   → driving directions (not walking / transit).
function gmapsUrl(lat: number, lng: number): string {
  // Maps URL API does not use an API key — key is only for embedded/static maps
  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&destination=${coord(lat)},${coord(lng)}` +
    '&travelmode=driving' +
    '&dir_action=navigate'
  )
}

// ── Static map preview ────────────────────────────────────────────────────────
// Returns a Maps Static API URL for an in-app map thumbnail.
// scale=2  → retina/HDPI, size=600x240 rendered at 300x120 CSS pixels.
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

function wazeUrl(lat: number, lng: number): string {
  // navigate=yes  → start navigation immediately (not just show the pin).
  return `https://waze.com/ul?ll=${coord(lat)},${coord(lng)}&navigate=yes&zoom=17`
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function openDirections(
  station: Station,
  app: 'gmaps' | 'waze'
): Promise<void> {
  const { latitude: lat, longitude: lng } = station
  const url = app === 'gmaps' ? gmapsUrl(lat, lng) : wazeUrl(lat, lng)

  if (Capacitor.isNativePlatform()) {
    // Browser.open() uses Chrome Custom Tabs (Android) and SFSafariViewController (iOS).
    // Both platforms honour App Links / Universal Links, so a maps.google.com URL
    // automatically opens the Google Maps app when it is installed, and falls back
    // to the in-app browser when it is not — no custom URI scheme required.
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
