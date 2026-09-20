import { describe, expect, it } from 'vitest'
import { validateDeliveryAddress } from './order-validation'

describe('order validation', () => {
  it('matches the backend delivery address rules', () => {
    expect(validateDeliveryAddress('  10 Herzl St  ')).toBeNull()
    expect(validateDeliveryAddress('   ')).toBe('validation.deliveryEmpty')
    expect(validateDeliveryAddress('x'.repeat(201))).toBe(
      'validation.deliveryLength'
    )
  })
})
