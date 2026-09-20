import { describe, expect, it } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validatePhone
} from './account-validation'

describe('account validation', () => {
  it('matches the backend email, password, and phone rules', () => {
    expect(validateEmail('  User@Example.COM  ')).toBeNull()
    expect(validateEmail('nope')).toBe('validation.emailInvalid')
    expect(validatePassword('password1')).toBeNull()
    expect(validatePassword('short')).toBe('validation.passwordLength')
    expect(validatePhone('050 123-4567')).toBeNull()
    expect(validatePhone('abc')).toBe('validation.phoneInvalid')
  })
})
