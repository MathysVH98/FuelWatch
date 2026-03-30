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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user:    null,
    loading: true,
    error:   null,
  })

  useEffect(() => {
    // Get initial session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id)
        setState({
          session,
          user: profile ? { ...profile, email: session.user.email } : null,
          loading: false,
          error: null,
        })
      } else {
        setState({ session: null, user: null, loading: false, error: null })
      }
    })

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id)
          setState({
            session,
            user: profile ? { ...profile, email: session.user.email } : null,
            loading: false,
            error: null,
          })
        } else {
          setState({ session: null, user: null, loading: false, error: null })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return state
}