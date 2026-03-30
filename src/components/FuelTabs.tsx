import type { FuelType } from '../types'

interface FuelTabsProps {
  selected: FuelType
  onChange: (type: FuelType) => void
}

interface TabDef {
  type: FuelType
  label: string
  shortLabel: string
}

const TABS: TabDef[] = [
  { type: 'p93', label: 'Petrol 93', shortLabel: 'P93' },
  { type: 'p95', label: 'Petrol 95', shortLabel: 'P95' },
  { type: 'd005', label: 'Diesel 0.05%', shortLabel: 'D 0.05' },
  { type: 'd0005', label: 'Diesel 0.005%', shortLabel: 'D 0.005' },
]

export function FuelTabs({ selected, onChange }: FuelTabsProps) {
  return (
    <div style={styles.wrapper} className="no-scrollbar">
      {TABS.map((tab) => {
        const isActive = tab.type === selected
        return (
          <button
            key={tab.type}
            onClick={() => onChange(tab.type)}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : styles.tabInactive),
            }}
          >
            <span style={styles.shortLabel}>{tab.shortLabel}</span>
            <span style={styles.longLabel}>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto' as const,
    padding: '0 16px',
    scrollSnapType: 'x mandatory',
  },
  tab: {
    flexShrink: 0,
    scrollSnapAlign: 'start',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minWidth: 72,
    minHeight: 44,
  },
  tabActive: {
    background: 'rgba(0, 200, 255, 0.12)',
    borderColor: 'var(--cyan)',
    color: 'var(--cyan)',
  },
  tabInactive: {
    background: 'var(--surface)',
    borderColor: 'var(--border)',
    color: 'var(--muted)',
  },
  shortLabel: {
    fontFamily: 'var(--font-hud)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  longLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: '9px',
    marginTop: 2,
    opacity: 0.7,
    whiteSpace: 'nowrap' as const,
  },
}
