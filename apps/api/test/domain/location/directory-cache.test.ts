import type { Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { DirectoryCache } from '../../../src/domain/location/index.js'

describe('DirectoryCache', () => {
  test('returns a fresh directory within the TTL and misses after it', () => {
    let now = 0
    const cache = new DirectoryCache({
      ttlMs: 1_000,
      staleIfErrorMs: 5_000,
      now: () => now
    })
    const list = [pizzeria('p1')]

    cache.set(list)
    assert.equal(cache.getFresh(), list)

    now = 999
    assert.equal(cache.getFresh(), list)

    now = 1_000
    assert.equal(cache.getFresh(), undefined)
    assert.equal(cache.getStale(), list)
  })

  test('forgets the directory after the stale-if-error window', () => {
    let now = 0
    const cache = new DirectoryCache({
      ttlMs: 1_000,
      staleIfErrorMs: 5_000,
      now: () => now
    })

    cache.set([pizzeria('p1')])
    now = 5_000
    assert.equal(cache.getStale(), undefined)
    assert.equal(cache.getFresh(), undefined)
  })
})

function pizzeria (id: string): Pizzeria {
  return {
    id,
    name: id,
    latitude: 32.08,
    longitude: 34.78,
    averageEta: null
  }
}
