import { describe, expect, it } from 'vitest'
import { validateFavoriteName } from './favorite-validation'

describe('favorite validation', () => {
  it('matches the backend favorite name length rules', () => {
    expect(validateFavoriteName('  Weeknight  ')).toBeNull()
    expect(validateFavoriteName('   ')).toBe(
      'Favorite name must be between 1 and 80 characters'
    )
    expect(validateFavoriteName('a'.repeat(81))).toBe(
      'Favorite name must be between 1 and 80 characters'
    )
  })
})
