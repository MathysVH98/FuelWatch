import { supabase } from './supabase'
import type { AuthUser } from '../types/auth'

// ── Internal DB row shape ────────────────────────────────────
interface ProfileRow {
  id: string
  display_name: string | null
  reports_count: number
  reputation: number
  preferred_zone: 'inland' | 'coastal'
  preferred_fuel: 'p93' | 'p95' | 'd005' | 'd0005'
  notify_dmre: boolean
  notify_cheaper: boolean
}

// ── Sign up with email & password ───────────────────────────
export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: displayName } },
  })
  if (error) throw error
  return data
}

// ── Sign in with email & password ───────────────────────────
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// ── Sign out ─────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── Get current session ──────────────────────────────────────
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

// ── Fetch full profile from DB (maps snake_case → camelCase) ─
export async function getProfile(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('getProfile error:', error)
    return null
  }

  const row = data as ProfileRow

  return {
    id: row.id,
    email: undefined,
    displayName: row.display_name,
    reportsCount: row.reports_count,
    reputation: row.reputation,
    preferredZone: row.preferred_zone,
    preferredFuel: row.preferred_fuel,
    notifyDmre: row.notify_dmre,
    notifyCheaper: row.notify_cheaper,
  }
}

// ── Update profile preferences ───────────────────────────────
export async function updateProfile(
  userId: string,
  updates: Partial<{
    display_name: string
    preferred_zone: 'inland' | 'coastal'
    preferred_fuel: 'p93' | 'p95' | 'd005' | 'd0005'
    notify_dmre: boolean
    notify_cheaper: boolean
  }>
) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
}
