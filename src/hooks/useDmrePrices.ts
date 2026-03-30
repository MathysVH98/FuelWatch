import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { FuelType, PriceZone, DmrePrice } from '../types'

interface UseDmrePricesResult {
  /** Latest official price in cents per fuel type for the selected zone */
  prices: Partial<Record<FuelType, number>>
  /** The date these prices came into effect, e.g. "2026-03-05" */
  effectiveDate: string | null
  loading: boolean
}

export function useDmrePrices(zone: PriceZone): UseDmrePricesResult {
  const [prices, setPrices] = useState<Partial<Record<FuelType, number>>>({})
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrices(): Promise<void> {
      // Fetch all rows for this zone, newest first.
      // We keep only the latest entry per fuel_type (the DB may store history).
      const { data, error } = await supabase
        .from('dmre_prices')
        .select('fuel_type, price_cents, effective_date')
        .eq('zone', zone)
        .order('effective_date', { ascending: false })

      if (error) {
        console.error('useDmrePrices error:', error)
        setLoading(false)
        return
      }

      const rows = (data ?? []) as DmrePrice[]
      const seen = new Set<FuelType>()
      const map: Partial<Record<FuelType, number>> = {}
      let latest: string | null = null

      for (const row of rows) {
        if (!seen.has(row.fuel_type)) {
          seen.add(row.fuel_type)
          map[row.fuel_type] = row.price_cents
          if (!latest) latest = row.effective_date
        }
      }

      setPrices(map)
      setEffectiveDate(latest)
      setLoading(false)
    }

    void fetchPrices()

    // Realtime — admin updates the table → all clients refresh automatically
    const channel = supabase
      .channel(`dmre_prices_${zone}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dmre_prices', filter: `zone=eq.${zone}` },
        () => { void fetchPrices() }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [zone])

  return { prices, effectiveDate, loading }
}
