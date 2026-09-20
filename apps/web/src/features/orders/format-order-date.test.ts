import { describe, expect, it } from 'vitest'
import { formatOrderPlacedAt } from './format-order-date'

describe('formatOrderPlacedAt', () => {
  const iso = '2026-09-17T22:00:00.000Z'

  it('formats in the local timezone without a UTC label', () => {
    const date = new Date(iso)
    const english = formatOrderPlacedAt(iso, 'en')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    expect(english).not.toMatch(/UTC/)
    expect(english).toContain('2026')
    expect(english).toContain(`${hours}:${minutes}`)
    expect(english).not.toBe(iso)
  })

  it('uses the Hebrew locale for Hebrew copy', () => {
    const hebrew = formatOrderPlacedAt(iso, 'he')
    const english = formatOrderPlacedAt(iso, 'en')

    expect(hebrew).not.toMatch(/UTC/)
    expect(hebrew).not.toBe(english)
  })

  it('returns the original string when the timestamp is invalid', () => {
    expect(formatOrderPlacedAt('not-a-date', 'en')).toBe('not-a-date')
  })
})
