import { useMemo } from 'react'
import { priceColor } from '../lib/scoring'
import type { Station, FuelType } from '../types'

interface FuelPriceStats {
  cheapest: number | null
  average: number | null
  priciest: number | null
  colorFor: (price: number) => string
}

export function useFuelPrices(stations: Station[], fuelType: FuelType): FuelPriceStats {
  return useMemo(() => {
    const prices = stations
      .map((s) => s.prices?.[fuelType])
      .filter((p): p is number => p !== undefined)

    if (prices.length === 0) {
      return {
        cheapest: null,
        average: null,
        priciest: null,
        colorFor: () => '#4A6080',
      }
    }

    const cheapest = Math.min(...prices)
    const priciest = Math.max(...prices)
    const average = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

    return {
      cheapest,
      average,
      priciest,
      colorFor: (price: number) => priceColor(price, prices),
    }
  }, [stations, fuelType])
}
