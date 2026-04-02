import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { Coords } from '../types'

export type PermissionState = 'unknown' | 'prompt' | 'granted' | 'denied'

interface GeolocationState {
  coords: Coords | null
  error: string | null
  loading: boolean
  permissionState: PermissionState
}

interface GeolocationHook extends GeolocationState {
  /** Call this when the user taps your in-app "Allow Location" button */
  requestLocation: () => void
}

export function useGeolocation(): GeolocationHook {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    error: null,
    loading: true,
    permissionState: 'unknown',
  })

  const startWatch = useCallback((cancelled: { value: boolean }) => {
    let watchId: number | null = null

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled.value) return
        setState({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null, loading: false, permissionState: 'granted' })
      },
      (err) => {
        if (cancelled.value) return
        const denied = err.code === err.PERMISSION_DENIED
        setState({ coords: null, error: err.message, loading: false, permissionState: denied ? 'denied' : 'unknown' })
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    )

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled.value) return
        setState({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null, loading: false, permissionState: 'granted' })
      },
      () => { /* errors handled by getCurrentPosition above */ },
      { enableHighAccuracy: true, maximumAge: 30_000 },
    )

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    const cancelled = { value: false }
    let cleanup: (() => void) | undefined

    // ── Native (Capacitor) path ────────────────────────────────────────────────
    if (Capacitor.isNativePlatform()) {
      async function startNative() {
        try {
          const permission = await Geolocation.requestPermissions()
          if (cancelled.value) return
          if (permission.location !== 'granted') {
            setState({ coords: null, error: 'Location permission denied', loading: false, permissionState: 'denied' })
            return
          }
          setState((s) => ({ ...s, permissionState: 'granted' }))
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
          if (!cancelled.value) {
            setState({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null, loading: false, permissionState: 'granted' })
          }
          const watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
            if (cancelled.value || err || !position) return
            setState({ coords: { lat: position.coords.latitude, lng: position.coords.longitude }, error: null, loading: false, permissionState: 'granted' })
          })
          cleanup = () => { void Geolocation.clearWatch({ id: watchId as string }) }
        } catch (err) {
          if (!cancelled.value) {
            setState({ coords: null, error: err instanceof Error ? err.message : 'Location unavailable', loading: false, permissionState: 'unknown' })
          }
        }
      }
      void startNative()
      return () => { cancelled.value = true; cleanup?.() }
    }

    // ── Web path ───────────────────────────────────────────────────────────────
    if (!navigator.geolocation) {
      setState({ coords: null, error: 'Geolocation not supported', loading: false, permissionState: 'denied' })
      return
    }

    // Check existing permission state without triggering a prompt
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        if (cancelled.value) return

        if (status.state === 'denied') {
          setState({ coords: null, error: 'Location access blocked in browser settings', loading: false, permissionState: 'denied' })
          return
        }

        if (status.state === 'granted') {
          // Already allowed — start watching silently
          setState((s) => ({ ...s, permissionState: 'granted', loading: true }))
          cleanup = startWatch(cancelled)
          return
        }

        // state === 'prompt' — don't fire the native dialog automatically,
        // wait for the user to tap the in-app button
        setState((s) => ({ ...s, permissionState: 'prompt', loading: false }))

        // Watch for the user granting/denying via browser settings changes
        status.onchange = () => {
          if (cancelled.value) return
          if (status.state === 'granted') {
            setState((s) => ({ ...s, permissionState: 'granted', loading: true }))
            cleanup = startWatch(cancelled)
          } else if (status.state === 'denied') {
            setState({ coords: null, error: 'Location access blocked in browser settings', loading: false, permissionState: 'denied' })
          }
        }
      }).catch(() => {
        // Permissions API not available — fall back to auto-requesting
        cleanup = startWatch(cancelled)
      })
    } else {
      // No Permissions API — just request directly
      cleanup = startWatch(cancelled)
    }

    return () => { cancelled.value = true; cleanup?.() }
  }, [startWatch])

  // Called when the user taps the in-app "Allow Location" button
  const requestLocation = useCallback(() => {
    if (Capacitor.isNativePlatform()) return // native handles itself on mount
    if (!navigator.geolocation) return
    setState((s) => ({ ...s, loading: true }))
    const cancelled = { value: false }
    startWatch(cancelled)
  }, [startWatch])

  return { ...state, requestLocation }
}
