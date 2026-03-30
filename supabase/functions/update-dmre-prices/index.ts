// supabase/functions/update-dmre-prices/index.ts
// Deno Edge Function — parse DMRE gazette text with Claude and upsert prices
// Deploy:  supabase functions deploy update-dmre-prices
// Invoke:  POST /functions/v1/update-dmre-prices  { "gazettText": "..." }
//          or scheduled via pg_cron / Supabase Scheduled Functions

import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role — can bypass RLS
)

// ── Tool schema ────────────────────────────────────────────────────────────────
const extractPricesTool: Anthropic.Tool = {
  name: 'save_dmre_prices',
  description:
    'Save the official DMRE regulated fuel prices extracted from the gazette announcement. ' +
    'Call this once with ALL prices found in the text.',
  input_schema: {
    type: 'object' as const,
    properties: {
      effective_date: {
        type: 'string',
        description: 'The date from which these prices are effective, in YYYY-MM-DD format.',
      },
      prices: {
        type: 'array',
        description: 'Array of fuel price entries.',
        items: {
          type: 'object',
          properties: {
            fuel_type: {
              type: 'string',
              enum: ['p93', 'p95', 'd005', 'd0005'],
              description:
                'p93=95-octane unleaded (or 93), p95=95-octane premium, ' +
                'd005=diesel 0.05% sulphur, d0005=diesel 0.005% sulphur',
            },
            zone: {
              type: 'string',
              enum: ['inland', 'coastal'],
              description: 'inland = Gauteng/Highveld, coastal = Cape Town/Durban/PE',
            },
            price_cents: {
              type: 'integer',
              description:
                'Price in South African cents per litre (e.g. R24.50 = 2450). ' +
                'Must be an integer number of cents.',
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
  // CORS preflight
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
    const body = await req.json().catch(() => ({}))
    const gazetteText: string | undefined = body.gazetteText

    if (!gazetteText || gazetteText.trim().length < 50) {
      return jsonResponse(
        { error: 'gazetteText is required and must contain the DMRE announcement text.' },
        400,
      )
    }

    // ── Ask Claude to extract the prices ──────────────────────────────────────
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      tools: [extractPricesTool],
      tool_choice: { type: 'tool', name: 'save_dmre_prices' },
      system:
        'You are a South African fuel price data extraction specialist. ' +
        'You parse official DMRE (Department of Mineral Resources and Energy) gazette ' +
        'announcements and extract regulated fuel prices. ' +
        'Petrol (93 & 95 octane) and Diesel (500ppm & 50ppm sulphur) prices vary by ' +
        'zone: INLAND (Gauteng/highveld areas) and COASTAL (Cape Town, Durban, PE). ' +
        'Always convert rand amounts to integer cents (R24.50 → 2450). ' +
        'Only extract prices that are explicitly stated; do not guess.',
      messages: [
        {
          role: 'user',
          content:
            'Please extract all fuel prices from the following DMRE gazette announcement:\n\n' +
            gazetteText,
        },
      ],
    })

    // ── Extract tool call result ───────────────────────────────────────────────
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

    // ── Upsert into dmre_prices ────────────────────────────────────────────────
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

    return jsonResponse({
      success: true,
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
