import { describe, expect, it } from 'vitest'
import { validateDeliveryAddress } from './order-validation'

describe('order validation', () => {
  it('matches the backend delivery address rules', () => {
    expect(validateDeliveryAddress('  10 Herzl St  ')).toBeNull()
    expect(validateDeliveryAddress('   ')).toBe(
      'Delivery address must not be empty'
    )
    expect(validateDeliveryAddress('x'.repeat(201))).toBe(
      'Delivery address must not exceed 200 characters'
    )
  })
})
