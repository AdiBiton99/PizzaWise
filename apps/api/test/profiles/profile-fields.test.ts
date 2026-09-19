import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assertProfileBodyShape,
  MAX_DISPLAY_NAME_LENGTH,
  normalizeDisplayName,
  normalizePhone,
  ProfileValidationError
} from '../../src/profiles/profile-fields.js'

test('rejects a body with unknown keys', () => {
  assert.throws(
    () => assertProfileBodyShape({
      displayName: 'Ada',
      phone: '0501234567',
      userId: 'nope'
    }),
    ProfileValidationError
  )
})

test('trims a valid display name', () => {
  assert.equal(normalizeDisplayName('  Ada  '), 'Ada')
})

test('rejects an empty or overlong display name', () => {
  assert.throws(() => normalizeDisplayName('   '), ProfileValidationError)
  assert.throws(
    () => normalizeDisplayName('a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)),
    ProfileValidationError
  )
})

test('accepts local and international phones and strips separators', () => {
  assert.equal(normalizePhone('0501234567'), '0501234567')
  assert.equal(normalizePhone('050 123 4567'), '0501234567')
  assert.equal(normalizePhone('050-123-4567'), '0501234567')
  assert.equal(normalizePhone('+972501234567'), '+972501234567')
  assert.equal(normalizePhone('+972 50-123-4567'), '+972501234567')
})

test('rejects malformed phones', () => {
  assert.throws(() => normalizePhone(''), ProfileValidationError)
  assert.throws(() => normalizePhone('1234567'), ProfileValidationError)
  assert.throws(() => normalizePhone('05012abc67'), ProfileValidationError)
  assert.throws(() => normalizePhone('+1234567890123456'), ProfileValidationError)
})
