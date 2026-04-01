// supabase/functions/update-dmre-prices/index.ts
// Deno Edge Function — scrapes AA South Africa fuel price page and upserts prices
//
// No AI / external API needed — direct HTML parsing of aa.co.za/fuel-price/
//
// Deploy:   supabase functions deploy update-dmre-prices --no-verify-jwt
// Invoke:   POST https://<project>.supabase.co/functions/v1/update-dmre-prices
// Schedule: pg_cron job on the 1st of each month

import { createClient } from 'npm:@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── Types ──────────────────────────────────────────────────────────────────────
interface PriceRow {
  fuel_type: 'p93' | 'p95' | 'd005' | 'd0005'
  zone: 'inland' | 'coastal'
  price_cents: number
  effective_date: string
}

// ── Scraper ────────────────────────────────────────────────────────────────────
// AA South Africa publishes a clean table at https://www.aa.co.za/fuel-price/
// Fuel names and rand values appear as plain text — we match them with regex.

async function scrapePrices(): Promise<PriceRow[]> {
  const res = await fetch('https://www.aa.co.za/fuel-price/', {
    headers: { 'User-Agent': 'FuelWatch-SA/1.0' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`AA page returned ${res.status}`)

  const html = await res.text()

  // Strip tags to get readable text, collapse whitespace
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')

  // ── Extract effective date ──────────────────────────────────────────────────
  // AA page says e.g. "effective 5 March 2026" or "1 April 2026"
  const dateMatch = text.match(
    /effective[^\d]*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
  )
  const MONTHS: Record<string, string> = {
    january:'01', february:'02', march:'03', april:'04',
    may:'05', june:'06', july:'07', august:'08',
    september:'09', october:'10', november:'11', december:'12',
  }
  let effectiveDate = new Date().toISOString().slice(0, 10) // fallback: today
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0')
    const month = MONTHS[dateMatch[2].toLowerCase()]
    const year = dateMatch[3]
    effectiveDate = `${year}-${month}-${day}`
  }

  // ── Extract prices ──────────────────────────────────────────────────────────
  // Helper: find the first rand value (R xx.xx or xx.xx) after a keyword
  function extractPrice(keyword: RegExp): number | null {
    const match = text.match(keyword)
    if (!match || match.index === undefined) return null
    const after = text.slice(match.index, match.index + 200)
    const prices = [...after.matchAll(/R?\s*(\d{1,2}[.,]\d{2})/g)]
    if (!prices.length) return null
    return Math.round(parseFloat(prices[0][1].replace(',', '.')) * 100)
  }

  // AA page labels: "95 Unleaded", "93 Unleaded", "Diesel (0.05%)", "Diesel (0.005%)"
  // Inland price comes first, then coastal on the same row or adjacent section.
  // We grab the first two numeric matches after each fuel label.
  function extractBothZones(keyword: RegExp): [number, number] | null {
    const match = text.match(keyword)
    if (!match || match.index === undefined) return null
    const after = text.slice(match.index, match.index + 400)
    const prices = [...after.matchAll(/R?\s*(\d{1,2}[.,]\d{2})/g)]
    if (prices.length < 2) return null
    return [
      Math.round(parseFloat(prices[0][1].replace(',', '.')) * 100), // inland
      Math.round(parseFloat(prices[1][1].replace(',', '.')) * 100), // coastal
    ]
  }

  const p95 = extractBothZones(/95\s*(?:octane|unleaded|ULP)/i)
  const p93 = extractBothZones(/93\s*(?:octane|unleaded|ULP)/i)
  const d005 = extractBothZones(/diesel[^.]*0\.05/i)
  const d0005 = extractBothZones(/diesel[^.]*0\.005/i)

  const rows: PriceRow[] = []

  if (p93) {
    rows.push({ fuel_type: 'p93', zone: 'inland',  price_cents: p93[0], effective_date: effectiveDate })
    rows.push({ fuel_type: 'p93', zone: 'coastal', price_cents: p93[1], effective_date: effectiveDate })
  }
  if (p95) {
    rows.push({ fuel_type: 'p95', zone: 'inland',  price_cents: p95[0], effective_date: effectiveDate })
    rows.push({ fuel_type: 'p95', zone: 'coastal', price_cents: p95[1], effective_date: effectiveDate })
  }
  if (d005) {
    rows.push({ fuel_type: 'd005', zone: 'inland',  price_cents: d005[0], effective_date: effectiveDate })
    rows.push({ fuel_type: 'd005', zone: 'coastal', price_cents: d005[1], effective_date: effectiveDate })
  }
  if (d0005) {
    rows.push({ fuel_type: 'd0005', zone: 'inland',  price_cents: d0005[0], effective_date: effectiveDate })
    rows.push({ fuel_type: 'd0005', zone: 'coastal', price_cents: d0005[1], effective_date: effectiveDate })
  }

  if (rows.length === 0) throw new Error('Could not parse any prices from AA page — layout may have changed.')

  return rows
}

// ── Handler ────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const rows = await scrapePrices()
    console.log(`Scraped ${rows.length} price rows, effective ${rows[0]?.effective_date}`)

    const { error } = await supabase
      .from('dmre_prices')
      .upsert(rows, { onConflict: 'fuel_type,zone,effective_date' })

    if (error) {
      console.error('Upsert error:', error)
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({
      success: true,
      effective_date: rows[0]?.effective_date,
      rows_upserted: rows.length,
      prices: rows.map((r) => ({
        ...r,
        rand: (r.price_cents / 100).toFixed(2),
      })),
    })
  } catch (err) {
    console.error('update-dmre-prices error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
