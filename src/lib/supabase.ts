import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Copy .env.example to .env and fill in your project credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ── RPC return type ─────────────────────────────────────────
export interface StationNearby {
  id: string
  name: string
  brand: string
  address: string | null
  latitude: number
  longitude: number
  distance_m: number
}

// ── RPC helper ───────────────────────────────────────────────
export async function fetchStationsNearMe(
  userLat: number,
  userLng: number,
  radiusM: number = 10_000
): Promise<StationNearby[]> {
  const { data, error } = await supabase.rpc('stations_near_me', {
    user_lat: userLat,
    user_lng: userLng,
    radius_m: radiusM,
  })

  if (error) throw error
  return (data ?? []) as StationNearby[]
}
