/**
 * CSS colour tokens for price bands.
 * Re-exported for convenience — actual logic lives in scoring.ts → priceColor().
 */
export const COLOR_CHEAP = '#00FF88'
export const COLOR_MID = '#FFB800'
export const COLOR_EXPENSIVE = '#FF3D5A'
export const COLOR_UNKNOWN = '#4A6080'

/** Format cents to a rand string, e.g. 2234 → "R 22.34" */
export function formatPrice(cents: number): string {
  return `R ${(cents / 100).toFixed(2)}`
}

/** Format a short price for tight UIs, e.g. 2234 → "22.34" */
export function formatPriceShort(cents: number): string {
  return (cents / 100).toFixed(2)
}
