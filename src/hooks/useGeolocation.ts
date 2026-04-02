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
    let watchId: string | number | null = null

    // 10s fallback so loading never hangs if the browser never fires a result
    const timeout = setTimeout(() => {
      if (!cancelled && state.coords === null) {
        setState((s) => s.loading ? { ...s, loading: false } : s)
      }
    }, 10_000)

    async function startNative(): Promise<void> {
      try {
        const permission = await Geolocation.requestPermissions()
        if (permission.location !== 'granted') {
          if (!cancelled) setState({ coords: null, error: 'Location permission denied', loading: false })
          return
        }
        // Get an immediate position first so UI doesn't wait for watch
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
        if (!cancelled) {
          setState({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null, loading: false })
        }
        // Then watch for updates
        watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
          if (cancelled) return
          if (err || !position) return
          setState({ coords: { lat: position.coords.latitude, lng: position.coords.longitude }, error: null, loading: false })
        })
      } catch (err) {
        if (!cancelled) {
          setState({ coords: null, error: err instanceof Error ? err.message : 'Location unavailable', loading: false })
        }
      }
    }

    function startWeb(): void {
      if (!navigator.geolocation) {
        setState({ coords: null, error: 'Geolocation not supported', loading: false })
        return
      }
      // Get an immediate fix first
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) {
            setState({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null, loading: false })
          }
        },
        (err) => {
          if (!cancelled) {
            setState({ coords: null, error: err.message, loading: false })
          }
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      )
      // Watch for position updates
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!cancelled) {
            setState({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null, loading: false })
          }
        },
        () => { /* silent — initial error already handled above */ },
        { enableHighAccuracy: true, maximumAge: 30_000 },
      )
    }

    if (Capacitor.isNativePlatform()) {
      void startNative()
    } else {
      startWeb()
    }

    return () => {
      cancelled = true
      clearTimeout(timeout)
      if (watchId !== null) {
        if (Capacitor.isNativePlatform()) {
          void Geolocation.clearWatch({ id: watchId as string })
        } else {
          navigator.geolocation.clearWatch(watchId as number)
        }
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
