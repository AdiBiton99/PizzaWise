import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assertValidPassword,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PasswordValidationError,
  verifyPassword
} from '../../src/auth/password.js'

test('rejects passwords outside the allowed length', () => {
  assert.throws(
    () => assertValidPassword('short'),
    PasswordValidationError
  )
  assert.throws(
    () => assertValidPassword('a'.repeat(MAX_PASSWORD_LENGTH + 1)),
    PasswordValidationError
  )
  assertValidPassword('a'.repeat(MIN_PASSWORD_LENGTH))
})

test('hashes with argon2id and verifies matching passwords', async () => {
  const hash = await hashPassword('correct-horse')
  assert.match(hash, /^\$argon2id\$/)
  assert.equal(await verifyPassword(hash, 'correct-horse'), true)
  assert.equal(await verifyPassword(hash, 'wrong-password'), false)
})
