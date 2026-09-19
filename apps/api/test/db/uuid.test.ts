import assert from 'node:assert/strict'
import { test } from 'node:test'
import { binaryToUuid, uuidToBinary } from '../../src/db/uuid.js'

test('round-trips a UUID through BINARY(16)', () => {
  const uuid = '550e8400-e29b-41d4-a716-446655440000'
  const binary = uuidToBinary(uuid)

  assert.equal(binary.length, 16)
  assert.equal(binaryToUuid(binary), uuid)
})

test('rejects malformed UUID values', () => {
  assert.throws(() => uuidToBinary('not-a-uuid'), RangeError)
  assert.throws(() => binaryToUuid(Buffer.alloc(15)), RangeError)
})
