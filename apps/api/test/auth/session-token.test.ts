import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  generateSessionToken,
  hashSessionToken
} from '../../src/auth/session-token.js'

test('generates unique raw tokens and hashes them as 64-character hex', () => {
  const first = generateSessionToken()
  const second = generateSessionToken()

  assert.notEqual(first, second)
  assert.equal(hashSessionToken(first).length, 64)
  assert.match(hashSessionToken(first), /^[0-9a-f]{64}$/)
  assert.equal(hashSessionToken(first), hashSessionToken(first))
  assert.notEqual(hashSessionToken(first), hashSessionToken(second))
})
