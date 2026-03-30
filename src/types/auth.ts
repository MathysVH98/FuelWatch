export type AuthUser = {
  id: string
  email: string | undefined
  displayName: string | null
  reportsCount: number
  reputation: number
  preferredZone: 'inland' | 'coastal'
  preferredFuel: 'p93' | 'p95' | 'd005' | 'd0005'
  notifyDmre: boolean
  notifyCheaper: boolean
}