import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/auth'
import type { AuthUser } from '../types/auth'
import type { Session } from '@supabase/supabase-js'

type AuthState = {
  session:  Session | null
  user:     AuthUser | null
  loading:  boolean
  error:    string | null
}

function defaultUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.user_metadata?.full_name ?? null,
    reportsCount: 0,
    reputation: 100,
    preferredZone: 'inland',
    preferredFuel: 'd005',
    notifyDmre: false,
    notifyCheaper: false,
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user:    null,
    loading: true,
    error:   null,
  })

  useEffect(() => {
    // Hard safety net — if onAuthStateChange never fires (network completely
    // unreachable on first launch), don't leave user stuck on loading screen
    const timeout = setTimeout(() => {
      setState((prev) => prev.loading ? { ...prev, loading: false } : prev)
    }, 4000)

    // Supabase v2 fires INITIAL_SESSION on mount with the persisted session
    // (or null). This replaces the separate getSession() call and is reliable
    // on both web and Capacitor/Android.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
          // Resolve loading immediately — don't wait for network
          clearTimeout(timeout)
          if (session) {
            // Let user in right away with metadata-based defaults…
            setState({ session, user: defaultUser(session), loading: false, error: null })
            // …then silently enrich with the DB profile in background
            void getProfile(session.user.id).then((profile) => {
              if (profile) {
                setState((prev) => prev.session?.user.id === session.user.id
                  ? { ...prev, user: { ...profile, email: session.user.email } }
                  : prev
                )
              }
            })
          } else {
            setState({ session: null, user: null, loading: false, error: null })
          }
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          clearTimeout(timeout)
          if (session) {
            setState((prev) => ({
              ...prev,
              session,
              user: prev.user ?? defaultUser(session),
              loading: false,
            }))
            void getProfile(session.user.id).then((profile) => {
              if (profile) {
                setState((prev) => prev.session?.user.id === session.user.id
                  ? { ...prev, user: { ...profile, email: session.user.email } }
                  : prev
                )
              }
            })
          }
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return state
}
