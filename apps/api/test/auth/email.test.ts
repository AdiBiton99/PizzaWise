import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EmailValidationError, normalizeEmail } from '../../src/auth/email.js'

test('trims and lowercases a valid email', () => {
  assert.equal(normalizeEmail('  Foo.Bar@Example.COM  '), 'foo.bar@example.com')
})

test('rejects an invalid email', () => {
  assert.throws(() => normalizeEmail('not-an-email'), EmailValidationError)
  assert.throws(() => normalizeEmail(''), EmailValidationError)
})
