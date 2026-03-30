export interface Database {
  public: {
    Tables: {
      stations: {
        Row: {
          id: string
          name: string
          brand: string
          address: string | null
          latitude: number
          longitude: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          brand: string
          address?: string | null
          latitude: number
          longitude: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string
          address?: string | null
          latitude?: number
          longitude?: number
          created_at?: string
        }
        Relationships: []
      }
      price_reports: {
        Row: {
          id: string
          station_id: string
          fuel_type: string
          price_cents: number
          reported_by: string | null
          reported_at: string
          verified: boolean
        }
        Insert: {
          id?: string
          station_id: string
          fuel_type: string
          price_cents: number
          reported_by?: string | null
          reported_at?: string
          verified?: boolean
        }
        Update: {
          id?: string
          station_id?: string
          fuel_type?: string
          price_cents?: number
          reported_by?: string | null
          reported_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'price_reports_station_id_fkey'
            columns: ['station_id']
            isOneToOne: false
            referencedRelation: 'stations'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      latest_prices: {
        Row: {
          station_id: string
          fuel_type: string
          price_cents: number
          reported_at: string
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
