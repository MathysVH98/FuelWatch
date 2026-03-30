import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { Coords } from '../types'

interface GeolocationState {
  coords: Coords | null
  error: string | null
  loading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchNative(): Promise<void> {
      try {
        const permission = await Geolocation.requestPermissions()
        if (permission.location !== 'granted') {
          if (!cancelled) {
            setState({ coords: null, error: 'Location permission denied', loading: false })
          }
          return
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
        if (!cancelled) {
          setState({
            coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            error: null,
            loading: false,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            coords: null,
            error: err instanceof Error ? err.message : 'Location unavailable',
            loading: false,
          })
        }
      }
    }

    function fetchWeb(): void {
      if (!navigator.geolocation) {
        setState({ coords: null, error: 'Geolocation not supported', loading: false })
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) {
            setState({
              coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              error: null,
              loading: false,
            })
          }
        },
        (err) => {
          if (!cancelled) {
            setState({ coords: null, error: err.message, loading: false })
          }
        },
        { enableHighAccuracy: true, timeout: 10_000 }
      )
    }

    if (Capacitor.isNativePlatform()) {
      void fetchNative()
    } else {
      fetchWeb()
    }

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
