import type { Menu, NearbyPizzeria, NearbyPizzeriaMenuResult, Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  recoverFailedNearbyPizzeriaMenus
} from '../../../src/domain/menus/index.js'
import { PizzeriaApiClientError } from '../../../src/integrations/pizzeria-api/index.js'

describe('recoverFailedNearbyPizzeriaMenus', () => {
  test('does not refetch successful menus or wait when nothing failed', async () => {
    const requested: string[] = []
    const sleeps: number[] = []
    const firstPass: NearbyPizzeriaMenuResult[] = [
      available('p-ok', menu('p-ok'))
    ]

    const recovered = await recoverFailedNearbyPizzeriaMenus(
      firstPass,
      {
        async getMenu (id) {
          requested.push(id)
          return menu(id)
        }
      },
      {
        cooldownMs: 1_000,
        sleep: async (ms) => {
          sleeps.push(ms)
        }
      }
    )

    assert.deepEqual(requested, [])
    assert.deepEqual(sleeps, [])
    assert.deepEqual(recovered, {
      menus: firstPass,
      firstPassCheckedCount: 1,
      recoveredCount: 0
    })
  })

  test('waits five seconds before retrying failed IDs', async () => {
    const sleeps: number[] = []

    await recoverFailedNearbyPizzeriaMenus(
      [unavailable('p-fail')],
      {
        async getMenu (id) {
          return menu(id)
        }
      },
      {
        sleep: async (ms) => {
          sleeps.push(ms)
        }
      }
    )

    assert.deepEqual(sleeps, [5_000])
  })

  test('retries only failed IDs after a cooldown and merges recoveries', async () => {
    const requested: string[] = []
    const sleeps: number[] = []
    const firstPass: NearbyPizzeriaMenuResult[] = [
      available('p-ok', menu('p-ok')),
      unavailable('p-fail'),
      unavailable('p-dead')
    ]

    const recovered = await recoverFailedNearbyPizzeriaMenus(
      firstPass,
      {
        async getMenu (id) {
          requested.push(id)
          if (id === 'p-dead') {
            throw new PizzeriaApiClientError('still down', { status: 500 })
          }
          return menu(id)
        }
      },
      {
        cooldownMs: 250,
        sleep: async (ms) => {
          sleeps.push(ms)
        }
      }
    )

    assert.deepEqual(sleeps, [250])
    assert.deepEqual(requested, ['p-fail', 'p-dead'])
    assert.equal(recovered.firstPassCheckedCount, 1)
    assert.equal(recovered.recoveredCount, 1)
    assert.deepEqual(
      recovered.menus.map((result) => result.status),
      ['available', 'available', 'unavailable']
    )
    assert.equal(
      recovered.menus[1]?.status === 'available'
        ? recovered.menus[1].menu.pizzeriaId
        : undefined,
      'p-fail'
    )
  })

  test('retries failed IDs serially', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const firstPass: NearbyPizzeriaMenuResult[] = [
      unavailable('p-a'),
      unavailable('p-b')
    ]
    const firstStarted = createDeferred()
    const releaseFirst = createDeferred()

    const recovery = recoverFailedNearbyPizzeriaMenus(
      firstPass,
      {
        async getMenu (id) {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          if (id === 'p-a') {
            firstStarted.resolve()
            await releaseFirst.promise
          }
          inFlight -= 1
          return menu(id)
        }
      },
      {
        cooldownMs: 0,
        sleep: async () => undefined
      }
    )

    await firstStarted.promise
    assert.equal(maxInFlight, 1)
    releaseFirst.resolve()

    const recovered = await recovery
    assert.equal(maxInFlight, 1)
    assert.equal(recovered.recoveredCount, 2)
  })
})

function available (
  id: string,
  menuValue: Menu
): NearbyPizzeriaMenuResult {
  return {
    nearby: nearbyPizzeria(id),
    status: 'available',
    menu: menuValue
  }
}

function unavailable (id: string): NearbyPizzeriaMenuResult {
  return {
    nearby: nearbyPizzeria(id),
    status: 'unavailable'
  }
}

function nearbyPizzeria (id: string): NearbyPizzeria {
  const pizzeria: Pizzeria = {
    id,
    name: id,
    latitude: 32.08,
    longitude: 34.78,
    averageEta: null
  }

  return { pizzeria, distanceKm: 1 }
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
