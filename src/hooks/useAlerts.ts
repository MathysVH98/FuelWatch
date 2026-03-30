import { useState } from 'react'
import type { PriceAlert } from '../types'

interface AlertPreferences {
  dmreChange: boolean
  cheaperFound: boolean
}

interface UseAlertsResult {
  alerts: PriceAlert[]
  prefs: AlertPreferences
  toggleDmre: () => void
  toggleCheaper: () => void
  markRead: (id: string) => void
}

// Mock alerts — replace with real push notification data in production
const MOCK_ALERTS: PriceAlert[] = [
  {
    id: '1',
    type: 'dmre_change',
    title: 'DMRE Price Update',
    body: 'Petrol 95 increased by 28c/L effective 3 April 2024.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'cheaper_found',
    title: 'Cheaper Diesel Found',
    body: 'SASOL on N1 is now R 0.12/L cheaper for Diesel 0.05%.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'dmre_change',
    title: 'DMRE Price Update',
    body: 'Petrol 93 decreased by 15c/L effective 6 March 2024.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    read: true,
  },
]

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<PriceAlert[]>(MOCK_ALERTS)
  const [prefs, setPrefs] = useState<AlertPreferences>({
    dmreChange: true,
    cheaperFound: true,
  })

  function toggleDmre(): void {
    setPrefs((p) => ({ ...p, dmreChange: !p.dmreChange }))
  }

  function toggleCheaper(): void {
    setPrefs((p) => ({ ...p, cheaperFound: !p.cheaperFound }))
  }

  function markRead(id: string): void {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
  }

  return { alerts, prefs, toggleDmre, toggleCheaper, markRead }
}
