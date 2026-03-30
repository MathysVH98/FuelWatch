export type FuelType = 'p93' | 'p95' | 'd005' | 'd0005'

export interface Station {
  id: string
  name: string
  brand: StationBrand
  address: string | null
  latitude: number
  longitude: number
  created_at: string
  // Computed at runtime
  distance?: number
  prices?: Partial<Record<FuelType, number>> // price in cents
}

export type StationBrand = 'BP' | 'SASOL' | 'ENGEN' | 'TOTAL' | 'SHELL' | 'CALTEX'

export interface FuelReport {
  id: string
  station_id: string
  fuel_type: FuelType
  price_cents: number
  reported_by: string | null
  reported_at: string
  verified: boolean
}

export interface LatestPrice {
  station_id: string
  fuel_type: FuelType
  price_cents: number
  reported_at: string
}

export interface PriceAlert {
  id: string
  type: 'dmre_change' | 'cheaper_found'
  title: string
  body: string
  created_at: string
  read: boolean
}

export type SortMode = 'best_deal' | 'price' | 'nearest'

export type PriceZone = 'inland' | 'coastal'

export interface DmrePrice {
  fuel_type: FuelType
  zone: PriceZone
  price_cents: number
  effective_date: string  // ISO date string, e.g. "2026-03-05"
}

export interface Coords {
  lat: number
  lng: number
}
