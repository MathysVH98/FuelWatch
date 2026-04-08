import { useState, useEffect, useCallback } from 'react'
import { supabase, fetchStationsNearMe } from '../lib/supabase'
import { fuelScore } from '../lib/scoring'
import type { Station, FuelType, SortMode, Coords, LatestPrice } from '../types'

// Search radii — we try increasingly large circles so a user in any SA city
// always sees results, even if no stations have been added nearby yet.
const RADIUS_NEARBY_M  = 30_000   // 30 km  — first try (most urban users)
const RADIUS_REGION_M  = 100_000  // 100 km — second try (smaller towns)
const RADIUS_COUNTRY_M = 500_000  // 500 km — last resort (covers all of SA)

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
      // ── Step 1: fetch station list ────────────────────────────────────────────
      let stationList: Array<{
        id: string
        name: string
        brand: string
        address: string | null
        latitude: number
        longitude: number
        distance_km: number | undefined
      }>

      if (coords) {
        // Try progressively larger radii so every user sees results regardless
        // of how many stations are near them in the database.
        let nearby = await fetchStationsNearMe(coords.lat, coords.lng, RADIUS_NEARBY_M)
        if (nearby.length === 0) {
          nearby = await fetchStationsNearMe(coords.lat, coords.lng, RADIUS_REGION_M)
        }
        if (nearby.length === 0) {
          nearby = await fetchStationsNearMe(coords.lat, coords.lng, RADIUS_COUNTRY_M)
        }

        stationList = nearby.map((s) => ({
          id: s.id,
          name: s.name,
          brand: s.brand,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          distance_km: s.distance_m / 1000,
        }))
      } else {
        // No location — return all stations; client will sort by price/score
        const { data, error: stErr } = await supabase
          .from('stations_with_coords')
          .select('id, name, brand, address, latitude, longitude')
        if (stErr) throw stErr
        stationList = ((data ?? []) as RawStation[]).map((s) => ({
          id: s.id,
          name: s.name,
          brand: s.brand,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          distance_km: undefined,
        }))
      }

      // ── Step 2: fetch prices only for returned stations ───────────────────────
      const ids = stationList.map((s) => s.id)
      const { data: priceData, error: prErr } = ids.length
        ? await supabase.from('latest_prices').select('*').in('station_id', ids)
        : { data: [], error: null }

      if (prErr) throw prErr

      const priceMap = new Map<string, Partial<Record<FuelType, number>>>()
      for (const row of (priceData ?? []) as LatestPrice[]) {
        const existing = priceMap.get(row.station_id) ?? {}
        existing[row.fuel_type as FuelType] = row.price_cents
        priceMap.set(row.station_id, existing)
      }

      // ── Step 3: assemble Station objects ─────────────────────────────────────
      const stations: Station[] = stationList.map((s) => ({
        id: s.id,
        name: s.name,
        brand: s.brand as Station['brand'],
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        created_at: '',
        prices: priceMap.get(s.id),
        distance: s.distance_km,
      }))

      setRawStations(stations)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stations')
    } finally {
      setLoading(false)
    }
  }, [coords])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Realtime — any new price report triggers a refresh
  useEffect(() => {
    const channel = supabase
      .channel('price_reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'price_reports' },
        () => { void fetchData() }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [fetchData])

  // ── Sort ────────────────────────────────────────────────────────────────────
  const sorted = [...rawStations].sort((a, b) => {
    if (sortMode === 'nearest') {
      return (a.distance ?? Infinity) - (b.distance ?? Infinity)
    }
    if (sortMode === 'price') {
      return (a.prices?.[fuelType] ?? Infinity) - (b.prices?.[fuelType] ?? Infinity)
    }
    // best_deal — composite score of price + proximity
    const scoreA = fuelScore(a, fuelType, rawStations) ?? Infinity
    const scoreB = fuelScore(b, fuelType, rawStations) ?? Infinity
    return scoreA - scoreB
  })

  return { stations: sorted, loading, error, refresh: fetchData }
}
