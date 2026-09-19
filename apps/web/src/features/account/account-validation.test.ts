import { describe, expect, it } from 'vitest'
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePhone
} from './account-validation'

describe('account validation', () => {
  it('matches the backend email, password, name, and phone rules', () => {
    expect(validateEmail('  User@Example.COM  ')).toBeNull()
    expect(validateEmail('nope')).toBe('Email is invalid')
    expect(validatePassword('password1')).toBeNull()
    expect(validatePassword('short')).toBe(
      'Password must be between 8 and 128 characters'
    )
    expect(validateDisplayName('  Ada  ')).toBeNull()
    expect(validateDisplayName('   ')).toBe(
      'Display name must be between 1 and 80 characters'
    )
    expect(validatePhone('050 123-4567')).toBeNull()
    expect(validatePhone('abc')).toBe('Phone is invalid')
  })
})
