import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fuelScore } from '../lib/scoring'
import type { Station, FuelType, SortMode, Coords, LatestPrice } from '../types'

/** Haversine formula — returns distance in kilometres. */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface RawStation {
  id: string
  name: string
  brand: string
  address: string | null
  latitude: number
  longitude: number
  created_at: string
}

interface UseStationsResult {
  stations: Station[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useStations(
  coords: Coords | null,
  fuelType: FuelType,
  sortMode: SortMode
): UseStationsResult {
  const [rawStations, setRawStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [stationsRes, pricesRes] = await Promise.all([
        supabase.from('stations').select('*'),
        supabase.from('latest_prices').select('*'),
      ])

      if (stationsRes.error) throw stationsRes.error
      if (pricesRes.error) throw pricesRes.error

      const priceMap = new Map<string, Partial<Record<FuelType, number>>>()
      const priceRows = (pricesRes.data ?? []) as LatestPrice[]
      for (const row of priceRows) {
        const existing = priceMap.get(row.station_id) ?? {}
        existing[row.fuel_type as FuelType] = row.price_cents
        priceMap.set(row.station_id, existing)
      }

      const stationRows = (stationsRes.data ?? []) as RawStation[]
      const stations: Station[] = stationRows.map((s) => ({
        id: s.id,
        name: s.name,
        brand: s.brand as Station['brand'],
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        created_at: s.created_at,
        prices: priceMap.get(s.id),
        distance: coords
          ? haversine(coords.lat, coords.lng, s.latitude, s.longitude)
          : undefined,
      }))

      setRawStations(stations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stations')
    } finally {
      setLoading(false)
    }
  }, [coords])

  // Re-attach distances whenever coords change without a full refetch
  const stationsWithDist: Station[] = rawStations.map((s) => ({
    ...s,
    distance: coords
      ? haversine(coords.lat, coords.lng, s.latitude, s.longitude)
      : s.distance,
  }))

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Realtime subscription for new price reports
  useEffect(() => {
    const channel = supabase
      .channel('price_reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'price_reports' },
        () => {
          void fetchData()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchData])

  const sorted = [...stationsWithDist].sort((a, b) => {
    if (sortMode === 'nearest') {
      return (a.distance ?? Infinity) - (b.distance ?? Infinity)
    }
    if (sortMode === 'price') {
      return (a.prices?.[fuelType] ?? Infinity) - (b.prices?.[fuelType] ?? Infinity)
    }
    // best_deal
    const scoreA = fuelScore(a, fuelType, stationsWithDist) ?? Infinity
    const scoreB = fuelScore(b, fuelType, stationsWithDist) ?? Infinity
    return scoreA - scoreB
  })

  return { stations: sorted, loading, error, refresh: fetchData }
}
