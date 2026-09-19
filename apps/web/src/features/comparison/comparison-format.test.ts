import { describe, expect, it } from 'vitest'
import {
  formatDistanceKm,
  formatEta,
  formatPrice
} from './comparison-format'

describe('comparison formatters', () => {
  it('formats price with two decimals and the currency', () => {
    expect(formatPrice({ amountMinor: 3390, currency: 'ILS' })).toBe('33.90 ILS')
  })

  it('formats distance with one decimal kilometer', () => {
    expect(formatDistanceKm(1.23)).toBe('1.2 km')
    expect(formatDistanceKm(0)).toBe('0.0 km')
  })

  it('formats ETA as a single value or a range', () => {
    expect(formatEta({ minMinutes: 15, maxMinutes: 15 })).toBe('15 min')
    expect(formatEta({ minMinutes: 12, maxMinutes: 20 })).toBe('12–20 min')
    expect(formatEta(null)).toBe('Unknown')
  })
})
