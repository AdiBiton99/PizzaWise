import { describe, expect, it } from 'vitest'
import { validateFavoriteName } from './favorite-validation'

describe('favorite validation', () => {
  it('matches the backend favorite name length rules', () => {
    expect(validateFavoriteName('  Weeknight  ')).toBeNull()
    expect(validateFavoriteName('   ')).toBe('validation.favoriteNameLength')
    expect(validateFavoriteName('a'.repeat(81))).toBe(
      'validation.favoriteNameLength'
    )
  })
})
