// supabase/functions/ai-chat/index.ts
// Deno Edge Function — Claude AI chat proxy for FuelWatch SA
// Deploy:  supabase functions deploy ai-chat
// Invoke:  POST /functions/v1/ai-chat
//   body: { messages: ChatMessage[], context: PriceContext }

import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface StationContext {
  name: string
  brand: string
  distance?: number
  price?: number // cents
  fuelType: string
}

interface PriceContext {
  fuelType: string
  zone: 'inland' | 'coastal'
  dmrePrice?: number | null    // cents
  cheapest?: number | null     // cents
  average?: number | null      // cents
  priciest?: number | null     // cents
  nearbyStations?: StationContext[]
  effectiveDate?: string | null
}

// ── System prompt builder ──────────────────────────────────────────────────────
function buildSystemPrompt(ctx: PriceContext): string {
  const fuelLabel: Record<string, string> = {
    p93: 'Petrol 93',
    p95: 'Petrol 95',
    d005: 'Diesel 50ppm (0.05%)',
    d0005: 'Diesel 10ppm (0.005%)',
  }
  const isRegulated = ctx.fuelType === 'p93' || ctx.fuelType === 'p95'
  const zoneName = ctx.zone === 'inland' ? 'Inland (Gauteng/Highveld)' : 'Coastal (Cape Town / Durban / PE)'

  function centsToRand(c: number | null | undefined): string {
    if (c == null) return 'unknown'
    return `R${(c / 100).toFixed(2)}/L`
  }

  const lines: string[] = [
    'You are FuelWatch AI, an expert assistant for South African fuel prices.',
    'You help drivers find the cheapest fuel near them, understand DMRE regulated prices,',
    'and answer questions about fuel types, price zones, and savings tips.',
    '',
    '## Current Context',
    `Fuel type: ${fuelLabel[ctx.fuelType] ?? ctx.fuelType}`,
    `Zone: ${zoneName}`,
    `Regulated by DMRE: ${isRegulated ? 'Yes — price is fixed by government' : 'No — market-driven'}`,
  ]

  if (isRegulated && ctx.dmrePrice != null) {
    lines.push(`DMRE official price (${ctx.zone}): ${centsToRand(ctx.dmrePrice)}`)
    if (ctx.effectiveDate) {
      lines.push(
        `Effective from: ${new Date(ctx.effectiveDate).toLocaleDateString('en-ZA', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}`,
      )
    }
  }

  if (!isRegulated) {
    lines.push(`Cheapest nearby: ${centsToRand(ctx.cheapest)}`)
    lines.push(`Average nearby: ${centsToRand(ctx.average)}`)
    lines.push(`Priciest nearby: ${centsToRand(ctx.priciest)}`)
    if (ctx.dmrePrice != null) {
      lines.push(`DMRE maximum price: ${centsToRand(ctx.dmrePrice)}`)
    }
  }

  if (ctx.nearbyStations && ctx.nearbyStations.length > 0) {
    lines.push('')
    lines.push('## Nearby Stations (sorted by price)')
    ctx.nearbyStations.slice(0, 8).forEach((s, i) => {
      const dist = s.distance != null
        ? s.distance < 1
          ? `${Math.round(s.distance * 1000)}m`
          : `${s.distance.toFixed(1)}km`
        : ''
      const price = s.price != null ? centsToRand(s.price) : 'no price reported'
      lines.push(`${i + 1}. ${s.name} (${s.brand})${dist ? ` — ${dist}` : ''} — ${price}`)
    })
  }

  lines.push('')
  lines.push('## Guidelines')
  lines.push('- Be concise and helpful. Users are typically on mobile while driving or refuelling.')
  lines.push('- When citing prices, always include the R/L format and the zone.')
  lines.push('- If the user asks about a fuel type not in the current context, still answer generally.')
  lines.push('- Suggest practical savings tips when relevant (fill up before month-end, etc.).')
  lines.push('- Do not speculate about future price changes; only state what is known.')
  lines.push("- If you don't know something, say so clearly.")

  return lines.join('\n')
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
    const body = await req.json()
    const messages: ChatMessage[] = body.messages ?? []
    const context: PriceContext = body.context ?? { fuelType: 'd005', zone: 'inland' }

    if (!messages.length) {
      return jsonResponse({ error: 'messages array is required.' }, 400)
    }

    const systemPrompt = buildSystemPrompt(context)

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    const reply = textBlock?.text ?? ''

    return jsonResponse({ reply, stop_reason: response.stop_reason })
  } catch (err) {
    console.error('ai-chat error:', err)
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
