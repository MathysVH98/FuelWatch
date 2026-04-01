// supabase/functions/update-dmre-prices/index.ts
// Deno Edge Function — auto-fetches current SA fuel prices and upserts into dmre_prices
//
// Sources tried in order:
//   1. AA South Africa  — https://www.aa.co.za/fuel-price/
//   2. DMRE gov page    — https://www.energy.gov.za/petroleum/fuel-prices/retail-motor-fuel-price
//
// Claude parses whichever page responds and extracts all four fuel types × two zones.
//
// Deploy:   supabase functions deploy update-dmre-prices
// Invoke:   POST /functions/v1/update-dmre-prices   (no body needed — fetches live)
// Schedule: set up a Supabase pg_cron job to POST this on the 1st of each month

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── Price sources ──────────────────────────────────────────────────────────────
const SOURCES = [
  'https://www.aa.co.za/fuel-price/',
  'https://www.energy.gov.za/petroleum/fuel-prices/retail-motor-fuel-price',
]

async function fetchPricePageText(): Promise<{ text: string; source: string }> {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FuelWatch-SA/1.0 (price-updater)' },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) continue
      const html = await res.text()
      // Strip scripts/styles to reduce tokens — keep visible text
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (text.length > 200) return { text: text.slice(0, 12_000), source: url }
    } catch {
      // try next source
    }
  }
  throw new Error('All price sources failed to respond.')
}

// ── Tool schema ────────────────────────────────────────────────────────────────
const extractPricesTool: Anthropic.Tool = {
  name: 'save_fuel_prices',
  description:
    'Save the current South African retail fuel prices extracted from the page. ' +
    'Include ALL fuel types for BOTH zones (inland and coastal). ' +
    'Diesel prices are the DMRE maximum retail price per litre.',
  input_schema: {
    type: 'object' as const,
    properties: {
      effective_date: {
        type: 'string',
        description:
          'The date from which these prices are effective, YYYY-MM-DD. ' +
          'If only a month/year is shown, use the first Wednesday of that month.',
      },
      prices: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fuel_type: {
              type: 'string',
              enum: ['p93', 'p95', 'd005', 'd0005'],
              description:
                'p93 = Petrol 93 (ULP 93), p95 = Petrol 95 (ULP 95), ' +
                'd005 = Diesel 500ppm (0.05% sulphur), d0005 = Diesel 50ppm (0.005% sulphur)',
            },
            zone: {
              type: 'string',
              enum: ['inland', 'coastal'],
              description: 'inland = Gauteng/Highveld, coastal = Cape Town/Durban/Port Elizabeth',
            },
            price_cents: {
              type: 'integer',
              description:
                'Price in South African cents per litre. R24.50 = 2450. Must be integer cents.',
            },
          },
          required: ['fuel_type', 'zone', 'price_cents'],
        },
      },
    },
    required: ['effective_date', 'prices'],
  },
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
    // ── Fetch live price page ─────────────────────────────────────────────────
    const { text: pageText, source } = await fetchPricePageText()
    console.log(`Fetched price data from: ${source} (${pageText.length} chars)`)

    // ── Ask Claude to extract prices ──────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      tools: [extractPricesTool],
      tool_choice: { type: 'tool', name: 'save_fuel_prices' },
      system:
        'You are a South African fuel price extraction specialist. ' +
        'You read web page text from the AA South Africa or DMRE website and extract ' +
        'the current official retail fuel prices. ' +
        'South Africa has four fuel types: Petrol 93, Petrol 95, Diesel 500ppm, Diesel 50ppm. ' +
        'Prices differ between INLAND (Gauteng/Highveld) and COASTAL (Cape Town, Durban, PE) zones. ' +
        'Always convert rand to integer cents (R24.36 → 2436). ' +
        'Extract all 8 combinations (4 fuel types × 2 zones). ' +
        'Only use prices explicitly stated in the text — do not guess.',
      messages: [
        {
          role: 'user',
          content:
            'Extract all current South African retail fuel prices from this page text:\n\n' +
            pageText,
        },
      ],
    })

    // ── Parse tool result ─────────────────────────────────────────────────────
    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    )
    if (!toolUse) {
      return jsonResponse({ error: 'Claude did not return price data.' }, 500)
    }

    const extracted = toolUse.input as {
      effective_date: string
      prices: Array<{ fuel_type: string; zone: string; price_cents: number }>
    }

    if (!extracted.prices?.length) {
      return jsonResponse({ error: 'No prices extracted from page.' }, 500)
    }

    // ── Upsert into dmre_prices ───────────────────────────────────────────────
    const rows = extracted.prices.map((p) => ({
      fuel_type: p.fuel_type,
      zone: p.zone,
      price_cents: p.price_cents,
      effective_date: extracted.effective_date,
    }))

    const { error: upsertError } = await supabase
      .from('dmre_prices')
      .upsert(rows, { onConflict: 'fuel_type,zone,effective_date' })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return jsonResponse({ error: upsertError.message }, 500)
    }

    console.log(`Upserted ${rows.length} price rows for ${extracted.effective_date}`)

    return jsonResponse({
      success: true,
      source,
      effective_date: extracted.effective_date,
      rows_upserted: rows.length,
      prices: rows,
    })
  } catch (err) {
    console.error('update-dmre-prices error:', err)
    return jsonResponse({ error: String(err) }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
