import type { Menu, NearbyPizzeria, Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DEFAULT_MENU_FETCH_CONCURRENCY,
  fetchNearbyPizzeriaMenus,
  type MenuReader
} from '../../../src/domain/menus/index.js'
import {
  PizzeriaApiAdapterError,
  PizzeriaApiClientError
} from '../../../src/integrations/pizzeria-api/index.js'

describe('fetchNearbyPizzeriaMenus', () => {
  test('makes no menu requests for an empty nearby list', async () => {
    let menuCalls = 0
    const results = await fetchNearbyPizzeriaMenus([], {
      async getMenu () {
        menuCalls += 1
        throw new Error('Unexpected menu request')
      }
    })

    assert.deepEqual(results, [])
    assert.equal(menuCalls, 0)
  })

  test('returns canonical menus from the provided reader', async () => {
    const nearby = [nearbyPizzeria('p2', 0.5), nearbyPizzeria('p10', 0.6)]
    const menus = new Map([
      ['p2', menu('p2')],
      ['p10', menu('p10')]
    ])
    const requestedIds: string[] = []

    const results = await fetchNearbyPizzeriaMenus(nearby, {
      async getMenu (pizzeriaId) {
        requestedIds.push(pizzeriaId)
        return menus.get(pizzeriaId)!
      }
    })

    assert.deepEqual(
      requestedIds.sort(),
      ['p10', 'p2']
    )
    assert.deepEqual(results, [
      {
        nearby: nearby[0],
        status: 'available',
        menu: menus.get('p2')
      },
      {
        nearby: nearby[1],
        status: 'available',
        menu: menus.get('p10')
      }
    ])
  })

  test('isolates a partial menu failure without rejecting', async () => {
    const nearby = [
      nearbyPizzeria('p2', 0.5),
      nearbyPizzeria('p10', 0.6),
      nearbyPizzeria('p89', 0.8),
      nearbyPizzeria('p18', 1.1)
    ]
    const results = await fetchNearbyPizzeriaMenus(nearby, {
      async getMenu (pizzeriaId) {
        if (pizzeriaId === 'p89') {
          throw new PizzeriaApiClientError('sensitive upstream detail', {
            status: 500
          })
        }
        return menu(pizzeriaId)
      }
    })

    assert.deepEqual(
      results.map((result) => result.status),
      ['available', 'available', 'unavailable', 'available']
    )
    assert.equal(results[2]?.status, 'unavailable')
    assert.equal(results[2]?.nearby.pizzeria.id, 'p89')
    assert.equal('menu' in results[2]!, false)
    assert.doesNotMatch(JSON.stringify(results), /sensitive upstream detail/)
  })

  test('returns unavailable results when every menu request fails', async () => {
    const nearby = [nearbyPizzeria('p2', 0.5), nearbyPizzeria('p10', 0.6)]
    const results = await fetchNearbyPizzeriaMenus(nearby, {
      async getMenu () {
        throw new PizzeriaApiClientError('all menus down', { status: 503 })
      }
    })

    assert.deepEqual(
      results.map((result) => result.status),
      ['unavailable', 'unavailable']
    )
    assert.doesNotMatch(JSON.stringify(results), /all menus down/)
  })

  test('preserves nearby order when a later request finishes first', async () => {
    const nearby = [
      nearbyPizzeria('p2', 0.5),
      nearbyPizzeria('p10', 0.6),
      nearbyPizzeria('p89', 0.8)
    ]
    const releaseFirst = createDeferred()

    const resultsPromise = fetchNearbyPizzeriaMenus(
      nearby,
      {
        async getMenu (pizzeriaId) {
          if (pizzeriaId === 'p2') {
            await releaseFirst.promise
          }
          return menu(pizzeriaId)
        }
      },
      { concurrency: 3 }
    )

    assert.equal(
      await Promise.race([resultsPromise, Promise.resolve('pending')]),
      'pending'
    )
    releaseFirst.resolve()

    const results = await resultsPromise
    assert.deepEqual(
      results.map((result) => result.nearby.pizzeria.id),
      ['p2', 'p10', 'p89']
    )
  })

  test('respects bounded concurrency and keeps other workers moving', async () => {
    const nearby = [
      nearbyPizzeria('slow', 0.1),
      nearbyPizzeria('fast', 0.2),
      nearbyPizzeria('next', 0.3),
      nearbyPizzeria('last', 0.4)
    ]
    let inFlight = 0
    let maxInFlight = 0
    const twoStarted = createDeferred()
    const slow = createDeferred()
    const nextStarted = createDeferred()

    const resultsPromise = fetchNearbyPizzeriaMenus(
      nearby,
      {
        async getMenu (pizzeriaId) {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          if (inFlight === 2) {
            twoStarted.resolve()
          }
          if (pizzeriaId === 'slow') {
            await slow.promise
          }
          if (pizzeriaId === 'next') {
            nextStarted.resolve()
          }
          inFlight -= 1
          return menu(pizzeriaId)
        }
      },
      { concurrency: 2 }
    )

    await twoStarted.promise
    assert.equal(maxInFlight, 2)
    await nextStarted.promise
    assert.ok(maxInFlight <= 2)
    slow.resolve()

    const results = await resultsPromise
    assert.equal(maxInFlight, 2)
    assert.deepEqual(
      results.map((result) => result.nearby.pizzeria.id),
      ['slow', 'fast', 'next', 'last']
    )
  })

  test('uses four concurrent workers by default', async () => {
    const nearby = [0, 1, 2, 3, 4].map((index) =>
      nearbyPizzeria(`p${index}`, index)
    )
    let inFlight = 0
    let maxInFlight = 0
    const fourStarted = createDeferred()
    const gates = nearby.map(() => createDeferred())

    const resultsPromise = fetchNearbyPizzeriaMenus(nearby, {
      async getMenu (pizzeriaId) {
        const index = Number(pizzeriaId.slice(1))
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        if (inFlight === DEFAULT_MENU_FETCH_CONCURRENCY) {
          fourStarted.resolve()
        }
        await gates[index]!.promise
        inFlight -= 1
        return menu(pizzeriaId)
      }
    })

    await fourStarted.promise
    assert.equal(maxInFlight, DEFAULT_MENU_FETCH_CONCURRENCY)
    assert.equal(DEFAULT_MENU_FETCH_CONCURRENCY, 4)

    for (const gate of gates) {
      gate.resolve()
    }

    await resultsPromise
    assert.equal(maxInFlight, 4)
  })

  test('processes duplicate IDs independently without caching', async () => {
    const first = nearbyPizzeria('p2', 0.5)
    const second = nearbyPizzeria('p2', 0.5)
    const requestedIds: string[] = []

    const results = await fetchNearbyPizzeriaMenus([first, second], {
      async getMenu (pizzeriaId) {
        requestedIds.push(pizzeriaId)
        return menu(`${pizzeriaId}-${requestedIds.length}`)
      }
    })

    assert.deepEqual(requestedIds, ['p2', 'p2'])
    assert.equal(results.length, 2)
    assert.equal(results[0]?.status, 'available')
    assert.equal(results[1]?.status, 'available')
    if (results[0]?.status === 'available' && results[1]?.status === 'available') {
      assert.equal(results[0].menu.pizzeriaId, 'p2-1')
      assert.equal(results[1].menu.pizzeriaId, 'p2-2')
    }
  })

  test('maps client, adapter, and unexpected failures to unavailable', async () => {
    const nearby = [
      nearbyPizzeria('not-found', 0.1),
      nearbyPizzeria('rate-limited', 0.2),
      nearbyPizzeria('timeout', 0.3),
      nearbyPizzeria('malformed', 0.4),
      nearbyPizzeria('unexpected', 0.5)
    ]
    const reader: MenuReader = {
      async getMenu (pizzeriaId) {
        switch (pizzeriaId) {
          case 'not-found':
            throw new PizzeriaApiClientError('hidden 404 body', { status: 404 })
          case 'rate-limited':
            throw new PizzeriaApiClientError('hidden retry-after', { status: 429 })
          case 'timeout':
            throw new PizzeriaApiClientError('hidden timeout')
          case 'malformed':
            throw new PizzeriaApiAdapterError('hidden schema path')
          default:
            throw new Error('hidden unexpected failure')
        }
      }
    }

    const results = await fetchNearbyPizzeriaMenus(nearby, reader)
    const serialized = JSON.stringify(results)

    assert.deepEqual(
      results.map((result) => result.status),
      [
        'unavailable',
        'unavailable',
        'unavailable',
        'unavailable',
        'unavailable'
      ]
    )
    assert.doesNotMatch(serialized, /hidden/)
    for (const result of results) {
      assert.equal('menu' in result, false)
    }
  })

  test('rejects an invalid concurrency limit without fetching menus', async () => {
    let menuCalls = 0
    const reader: MenuReader = {
      async getMenu () {
        menuCalls += 1
        return menu('p2')
      }
    }

    await assert.rejects(
      async () =>
        await fetchNearbyPizzeriaMenus(
          [nearbyPizzeria('p2', 0.5)],
          reader,
          { concurrency: 0 }
        ),
      RangeError
    )
    await assert.rejects(
      async () =>
        await fetchNearbyPizzeriaMenus([], reader, { concurrency: -2 }),
      RangeError
    )
    assert.equal(menuCalls, 0)
  })
})

function nearbyPizzeria (id: string, distanceKm: number): NearbyPizzeria {
  const pizzeria: Pizzeria = {
    id,
    name: id,
    latitude: 32.08,
    longitude: 34.78,
    averageEta: null
  }

  return { pizzeria, distanceKm }
}

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

function createDeferred (): {
  promise: Promise<void>
  resolve: () => void
} {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}
