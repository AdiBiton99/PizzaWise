import type { Menu } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { MenuCache } from '../../../src/domain/menus/index.js'

describe('MenuCache', () => {
  test('returns a fresh menu within the TTL and misses after it', () => {
    let now = 0
    const cache = new MenuCache({
      ttlMs: 1_000,
      staleIfErrorMs: 5_000,
      now: () => now
    })
    const pizza = menu('p1')

    cache.set('p1', pizza)
    assert.equal(cache.getFresh('p1'), pizza)

    now = 999
    assert.equal(cache.getFresh('p1'), pizza)

    now = 1_000
    assert.equal(cache.getFresh('p1'), undefined)
    assert.equal(cache.getStale('p1'), pizza)
  })

  test('forgets menus after the stale-if-error window', () => {
    let now = 0
    const cache = new MenuCache({
      ttlMs: 1_000,
      staleIfErrorMs: 5_000,
      now: () => now
    })

    cache.set('p1', menu('p1'))
    now = 5_000
    assert.equal(cache.getStale('p1'), undefined)
    assert.equal(cache.getFresh('p1'), undefined)
  })
})

function menu (pizzeriaId: string): Menu {
  return {
    pizzeriaId,
    currency: 'ILS',
    sizes: [],
    crusts: [],
    sauces: [],
    toppings: []
  }
}
