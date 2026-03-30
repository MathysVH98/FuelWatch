import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FuelType, PriceZone, Station } from '../types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

interface PriceContext {
  fuelType: FuelType
  zone: PriceZone
  dmrePrice?: number | null
  cheapest?: number | null
  average?: number | null
  priciest?: number | null
  effectiveDate?: string | null
  nearbyStations?: Array<{
    name: string
    brand: string
    distance?: number
    price?: number
    fuelType: string
  }>
}

function makeId(): string {
  return Math.random().toString(36).slice(2)
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(
    async (userText: string, context: PriceContext) => {
      if (!userText.trim() || isLoading) return

      const userMsg: ChatMessage = { id: makeId(), role: 'user', content: userText.trim() }
      const placeholderId = makeId()
      const placeholder: ChatMessage = { id: placeholderId, role: 'assistant', content: '', loading: true }

      setMessages((prev) => [...prev, userMsg, placeholder])
      setIsLoading(true)

      try {
        // Build history for the Edge Function (exclude the placeholder)
        const history = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            messages: history,
            context: {
              fuelType: context.fuelType,
              zone: context.zone,
              dmrePrice: context.dmrePrice ?? null,
              cheapest: context.cheapest ?? null,
              average: context.average ?? null,
              priciest: context.priciest ?? null,
              effectiveDate: context.effectiveDate ?? null,
              nearbyStations: context.nearbyStations ?? [],
            },
          },
        })

        if (error) throw error

        const reply: string = data?.reply ?? 'Sorry, I could not get a response. Please try again.'

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId ? { ...m, content: reply, loading: false } : m,
          ),
        )
      } catch (err) {
        console.error('useAiChat error:', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: 'Something went wrong. Please check your connection and try again.',
                  loading: false,
                }
              : m,
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading],
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, sendMessage, clearMessages }
}

// Helper to build context from StationsPage state
export function buildChatContext(
  fuelType: FuelType,
  zone: PriceZone,
  stations: Station[],
  dmrePrice: number | null | undefined,
  cheapest: number | null,
  average: number | null,
  priciest: number | null,
  effectiveDate: string | null | undefined,
): PriceContext {
  return {
    fuelType,
    zone,
    dmrePrice,
    cheapest,
    average,
    priciest,
    effectiveDate,
    nearbyStations: stations.slice(0, 10).map((s) => ({
      name: s.name,
      brand: s.brand,
      distance: s.distance,
      price: s.prices?.[fuelType],
      fuelType,
    })),
  }
}
