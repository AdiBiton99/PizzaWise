import { describe, expect, it } from 'vitest'
import { createTranslate } from '../../i18n'
import {
  formatDistanceKm,
  formatEta,
  formatPrice
} from './comparison-format'

const he = createTranslate('he')

describe('comparison formatters', () => {
  it('formats price with two decimals and the currency', () => {
    expect(formatPrice({ amountMinor: 3390, currency: 'ILS' })).toBe('33.90 ILS')
    expect(formatPrice({ amountMinor: 3390, currency: 'ILS' }, he)).toBe(
      '33.90 ₪'
    )
  })

  it('formats distance with one decimal kilometer', () => {
    expect(formatDistanceKm(1.23)).toBe('1.2 km')
    expect(formatDistanceKm(0)).toBe('0.0 km')
    expect(formatDistanceKm(1.23, he)).toBe('1.2 ק״מ')
  })

  it('formats ETA as a single value or a range', () => {
    expect(formatEta({ minMinutes: 30, maxMinutes: 30, minutes: 30 })).toBe(
      '30 min'
    )
    expect(formatEta({ minMinutes: 40, maxMinutes: 50, minutes: 45 })).toBe(
      '40–50 min'
    )
    expect(formatEta({ minMinutes: 15, maxMinutes: 15, minutes: 15 })).toBe(
      '15 min'
    )
    expect(formatEta({ minMinutes: 12, maxMinutes: 20, minutes: 16 })).toBe(
      '12–20 min'
    )
    expect(formatEta(null)).toBe('Unknown')
    expect(formatEta({ minMinutes: 40, maxMinutes: 50, minutes: 45 }, he)).toBe(
      '40–50 דק׳'
    )
    expect(formatEta(null, he)).toBe('לא ידוע')
  })
})
