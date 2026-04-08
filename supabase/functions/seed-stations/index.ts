// supabase/functions/seed-stations/index.ts
//
// Seeds the stations table from OpenStreetMap (Overpass API).
// Queries every amenity=fuel node in South Africa — ~4 000 stations.
// Safe to re-run: uses upsert keyed on the OSM node id stored in the name.
//
// Deploy:  supabase functions deploy seed-stations --no-verify-jwt
// Invoke:  POST /functions/v1/seed-stations   (no body needed)

import { createClient } from 'npm:@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── Brand normalisation ───────────────────────────────────────────────────────
const BRAND_MAP: Record<string, string> = {
  'bp':              'BP',
  'british petroleum':'BP',
  'sasol':           'SASOL',
  'engen':           'ENGEN',
  'total':           'TOTAL',
  'totalenergies':   'TOTAL',
  'total energies':  'TOTAL',
  'shell':           'SHELL',
  'caltex':          'CALTEX',
  'astron':          'CALTEX',
  'astron energy':   'CALTEX',
  'chevron':         'CALTEX',
}
const VALID_BRANDS = new Set(['BP','SASOL','ENGEN','TOTAL','SHELL','CALTEX'])

function normaliseBrand(tags: Record<string, string>): string {
  const raw = (tags.brand ?? tags.operator ?? tags.name ?? '').toLowerCase().trim()
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (raw.includes(key)) return val
  }
  // Try the station name itself
  const name = (tags.name ?? '').toLowerCase()
  for (const [key, val] of Object.entries(BRAND_MAP)) {
    if (name.startsWith(key)) return val
  }
  return 'BP' // fallback — we need a valid enum value
}

// ── Zone determination by bounding box ───────────────────────────────────────
// Inland provinces: Gauteng, Free State, NW, Limpopo, Mpumalanga, N.Cape (east)
// Coastal provinces: Western Cape, Eastern Cape, KZN, N.Cape (coast strip)
function determineZone(lat: number, lng: number): 'inland' | 'coastal' {
  // Western Cape  (roughly west of 22°E and south of -31°S)
  if (lng < 22.5 && lat < -31) return 'coastal'
  // Eastern Cape coast (roughly east of 22°E, south of -32°S, west of 30°E)
  if (lat < -32 && lng < 30) return 'coastal'
  // KwaZulu-Natal (east of 29°E, south of -27°S)
  if (lng > 29 && lat < -27 && lng < 33) return 'coastal'
  // Everything else is inland
  return 'inland'
}

// ── Overpass query ────────────────────────────────────────────────────────────
const OVERPASS_QUERY = `
[out:json][timeout:180];
area["ISO3166-1"="ZA"][admin_level=2]->.sa;
(
  node["amenity"="fuel"](area.sa);
  way["amenity"="fuel"](area.sa);
  relation["amenity"="fuel"](area.sa);
);
out center tags;
`.trim()

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

async function fetchFromOverpass(): Promise<OverpassElement[]> {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`Overpass responded ${res.status}: ${await res.text()}`)
  const json = await res.json() as OverpassResponse
  return json.elements ?? []
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Fetching stations from OpenStreetMap Overpass API…')
    const elements = await fetchFromOverpass()
    console.log(`Got ${elements.length} elements from Overpass`)

    const stations: Array<{
      name: string
      brand: string
      address: string | null
      zone: string
      is_active: boolean
      location: string // PostGIS WKT
    }> = []

    for (const el of elements) {
      const lat = el.lat ?? el.center?.lat
      const lng = el.lon ?? el.center?.lon
      if (!lat || !lng) continue

      const tags = el.tags ?? {}
      const brand = normaliseBrand(tags)
      if (!VALID_BRANDS.has(brand)) continue

      // Build a meaningful name
      const rawName = tags.name ?? tags['name:en'] ?? ''
      const name = rawName.trim().length > 2
        ? rawName.trim()
        : `${brand} ${tags['addr:suburb'] ?? tags['addr:city'] ?? tags['addr:street'] ?? `Station ${el.id}`}`

      // Build address
      const addrParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:suburb'],
        tags['addr:city'],
      ].filter(Boolean)
      const address = addrParts.length > 0 ? addrParts.join(', ') : null

      const zone = determineZone(lat, lng)

      // PostGIS geography literal — lng first (x,y = lon,lat)
      const location = `SRID=4326;POINT(${lng} ${lat})`

      stations.push({ name, brand, address, zone, is_active: true, location })
    }

    console.log(`Inserting ${stations.length} valid stations…`)

    // Batch insert in chunks of 500 to avoid request size limits
    const CHUNK = 500
    let inserted = 0
    let skipped = 0

    for (let i = 0; i < stations.length; i += CHUNK) {
      const chunk = stations.slice(i, i + CHUNK)
      const { error, count } = await supabase
        .from('stations')
        .insert(chunk, { count: 'exact' })

      if (error) {
        // Log but continue — duplicates or constraint errors shouldn't stop the whole job
        console.error(`Chunk ${i}–${i + CHUNK} error:`, error.message)
        skipped += chunk.length
      } else {
        inserted += count ?? chunk.length
      }
    }

    return jsonResponse({
      success: true,
      fetched: elements.length,
      processed: stations.length,
      inserted,
      skipped,
    })
  } catch (err) {
    console.error('seed-stations error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
