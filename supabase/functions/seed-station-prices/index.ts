// supabase/functions/seed-station-prices/index.ts
// Scrapes myTank.co.za for per-station diesel prices and seeds price_reports.
// Matches myTank stations to our DB stations by proximity + name similarity.
//
// Deploy:  supabase functions deploy seed-station-prices --no-verify-jwt
// Invoke:  POST /functions/v1/seed-station-prices
//          Body (optional): { "lat": -26.2, "lng": 28.0, "radiusKm": 50 }
//          Defaults to major SA cities if no body provided.

import { createClient } from 'npm:@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface MyTankStation {
  name: string
  lat: number
  lng: number
  diesel500_cents: number | null  // 0.05% sulphur
  diesel50_cents: number | null   // 0.005% sulphur
}

interface DbStation {
  id: string
  name: string
  latitude: number
  longitude: number
}

// ── Haversine ─────────────────────────────────────────────────────────────────
function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Name similarity (basic token overlap) ─────────────────────────────────────
function nameSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean))
  const tokensB = new Set(b.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean))
  let overlap = 0
  for (const t of tokensA) if (tokensB.has(t)) overlap++
  return overlap / Math.max(tokensA.size, tokensB.size, 1)
}

// ── Scrape myTank ─────────────────────────────────────────────────────────────
// myTank uses a WordPress AJAX endpoint for their station map.
// We POST to their admin-ajax handler with lat/lng and a radius.
async function scrapeMyTank(lat: number, lng: number, radiusKm: number): Promise<MyTankStation[]> {
  const body = new URLSearchParams({
    action:    'mtank_get_stations',
    lat:       String(lat),
    lng:       String(lng),
    radius:    String(radiusKm),
    fuel_type: 'diesel',
    nonce:     '',
  })

  const res = await fetch('https://mytank.co.za/wp-admin/admin-ajax.php', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   'FuelWatch-SA/1.0',
      'Referer':      'https://mytank.co.za/',
    },
    body:   body.toString(),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) throw new Error(`myTank responded ${res.status}`)
  const json = await res.json()

  // myTank returns { success: true, data: { stations: [...] } }
  // Each station: { title, lat, lng, diesel_500ppm, diesel_50ppm, ... }
  const raw = json?.data?.stations ?? json?.stations ?? json?.data ?? []
  if (!Array.isArray(raw)) return []

  return raw
    .map((s: Record<string, unknown>) => {
      const parse = (v: unknown): number | null => {
        const n = parseFloat(String(v ?? ''))
        return isNaN(n) || n < 5 ? null : Math.round(n * 100)
      }
      return {
        name:            String(s.title ?? s.name ?? ''),
        lat:             parseFloat(String(s.lat ?? s.latitude ?? 0)),
        lng:             parseFloat(String(s.lng ?? s.longitude ?? 0)),
        diesel500_cents: parse(s.diesel_500ppm ?? s.diesel500 ?? s.d005 ?? s.price),
        diesel50_cents:  parse(s.diesel_50ppm  ?? s.diesel50  ?? s.d0005),
      }
    })
    .filter((s: MyTankStation) => s.name && s.lat && s.lng)
}

// ── Match & insert ─────────────────────────────────────────────────────────────
async function matchAndInsert(
  myTankStations: MyTankStation[],
  dbStations: DbStation[],
): Promise<{ matched: number; inserted: number }> {
  const reports: Array<{ station_id: string; fuel_type: string; price_cents: number }> = []

  for (const mt of myTankStations) {
    // Find the closest DB station within 0.3 km that also has a similar name
    let bestMatch: DbStation | null = null
    let bestScore = -1

    for (const db of dbStations) {
      const km = distKm(mt.lat, mt.lng, db.latitude, db.longitude)
      if (km > 0.3) continue // must be within 300m
      const score = nameSimilarity(mt.name, db.name) - km * 2
      if (score > bestScore) { bestScore = score; bestMatch = db }
    }

    if (!bestMatch) continue

    if (mt.diesel500_cents) {
      reports.push({ station_id: bestMatch.id, fuel_type: 'd005',  price_cents: mt.diesel500_cents })
    }
    if (mt.diesel50_cents) {
      reports.push({ station_id: bestMatch.id, fuel_type: 'd0005', price_cents: mt.diesel50_cents })
    }
  }

  if (!reports.length) return { matched: 0, inserted: 0 }

  const { error } = await supabase.from('price_reports').insert(reports)
  if (error) throw new Error(`Insert failed: ${error.message}`)

  return { matched: myTankStations.length, inserted: reports.length }
}

// ── Handler ────────────────────────────────────────────────────────────────────
// Major SA cities to sweep when no specific location is given
const SA_CITIES = [
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
  { name: 'Cape Town',    lat: -33.9249, lng: 18.4241 },
  { name: 'Durban',       lat: -29.8587, lng: 31.0218 },
  { name: 'Pretoria',     lat: -25.7479, lng: 28.2293 },
  { name: 'Port Elizabeth',lat: -33.9608, lng: 25.6022 },
  { name: 'Bloemfontein', lat: -29.0852, lng: 26.1596 },
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Load all our DB stations once
    const { data: dbData, error: dbErr } = await supabase
      .from('stations_with_coords')
      .select('id, name, latitude, longitude')
    if (dbErr) throw dbErr
    const dbStations = (dbData ?? []) as DbStation[]

    const body = await req.json().catch(() => ({}))
    const locations = body.lat && body.lng
      ? [{ name: 'custom', lat: body.lat, lng: body.lng }]
      : SA_CITIES
    const radiusKm: number = body.radiusKm ?? 40

    let totalMatched = 0, totalInserted = 0
    const results: Array<{ city: string; scraped: number; inserted: number; error?: string }> = []

    for (const loc of locations) {
      try {
        const stations = await scrapeMyTank(loc.lat, loc.lng, radiusKm)
        const { matched, inserted } = await matchAndInsert(stations, dbStations)
        totalMatched += matched
        totalInserted += inserted
        results.push({ city: loc.name, scraped: stations.length, inserted })
      } catch (err) {
        results.push({ city: loc.name, scraped: 0, inserted: 0, error: String(err) })
      }
    }

    return jsonResponse({ success: true, totalMatched, totalInserted, results })
  } catch (err) {
    console.error('seed-station-prices error:', err)
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
