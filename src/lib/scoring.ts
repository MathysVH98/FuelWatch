import type { Station, FuelType } from '../types'

/**
 * Weighted score: 60% price (normalised), 40% distance (normalised).
 * Lower score = better deal. Returns null if price or distance unavailable.
 */
export function fuelScore(
  station: Station,
  fuelType: FuelType,
  allStations: Station[]
): number | null {
  const price = station.prices?.[fuelType]
  const distance = station.distance

  if (price === undefined || price === null || distance === undefined) return null

  const allPrices = allStations
    .map((s) => s.prices?.[fuelType])
    .filter((p): p is number => p !== undefined && p !== null)

  const allDistances = allStations
    .map((s) => s.distance)
    .filter((d): d is number => d !== undefined)

  if (allPrices.length === 0 || allDistances.length === 0) return null

  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const minDist = Math.min(...allDistances)
  const maxDist = Math.max(...allDistances)

  const priceRange = maxPrice - minPrice
  const distRange = maxDist - minDist

  const normPrice = priceRange === 0 ? 0 : (price - minPrice) / priceRange
  const normDist = distRange === 0 ? 0 : (distance - minDist) / distRange

  return 0.6 * normPrice + 0.4 * normDist
}

/**
 * Returns a colour hex string based on where `price` falls among `allPrices`.
 * Bottom third → green, middle → yellow, top → red.
 */
export function priceColor(price: number, allPrices: number[]): string {
  if (allPrices.length === 0) return '#4A6080'

  const sorted = [...allPrices].sort((a, b) => a - b)
  const third = sorted.length / 3
  const lowThreshold = sorted[Math.floor(third)] ?? sorted[0]
  const highThreshold = sorted[Math.floor(2 * third)] ?? sorted[sorted.length - 1]

  if (price <= lowThreshold) return '#00FF88'
  if (price <= highThreshold) return '#FFB800'
  return '#FF3D5A'
}
