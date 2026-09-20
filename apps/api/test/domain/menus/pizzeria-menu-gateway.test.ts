import type { Menu } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  MenuCache,
  PizzeriaMenuGateway,
  UpstreamScheduler
} from '../../../src/domain/menus/index.js'
import { PizzeriaApiClientError } from '../../../src/integrations/pizzeria-api/index.js'

describe('PizzeriaMenuGateway', () => {
  test('serves a cached menu without refetching', async () => {
    let fetches = 0
    const gateway = new PizzeriaMenuGateway(
      async (id) => {
        fetches += 1
        return menu(id)
      },
      {
        scheduler: new UpstreamScheduler({
          concurrency: 1,
          minIntervalMs: 0,
          sleep: async () => undefined
        }),
        sleep: async () => undefined
      }
    )

    await gateway.getMenu('p1')
    await gateway.getMenu('p1')
    assert.equal(fetches, 1)
  })

  test('singleflights concurrent lookups for the same pizzeria', async () => {
    let fetches = 0
    const started = createDeferred()
    const release = createDeferred()
    const gateway = new PizzeriaMenuGateway(
      async (id) => {
        fetches += 1
        started.resolve()
        await release.promise
        return menu(id)
      },
      {
        scheduler: new UpstreamScheduler({
          concurrency: 1,
          minIntervalMs: 0,
          sleep: async () => undefined
        }),
        sleep: async () => undefined
      }
    )

    const first = gateway.getMenu('p1')
    const second = gateway.getMenu('p1')
    await started.promise
    release.resolve()

    assert.deepEqual(await Promise.all([first, second]), [menu('p1'), menu('p1')])
    assert.equal(fetches, 1)
  })

  test('retries by re-entering the scheduler instead of holding a slot', async () => {
    let fetches = 0
    let inFlight = 0
    let maxInFlight = 0
    const gateway = new PizzeriaMenuGateway(
      async (id) => {
        fetches += 1
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        inFlight -= 1
        if (fetches < 3) {
          throw new PizzeriaApiClientError('oven down', { status: 500, kind: 'http' })
        }
        return menu(id)
      },
      {
        scheduler: new UpstreamScheduler({
          concurrency: 1,
          minIntervalMs: 0,
          sleep: async () => undefined
        }),
        sleep: async () => undefined
      }
    )

    assert.deepEqual(await gateway.getMenu('p1'), menu('p1'))
    assert.equal(fetches, 3)
    assert.equal(maxInFlight, 1)
  })

  test('returns stale cache when a refresh fails', async () => {
    let now = 0
    let fetches = 0
    const cache = new MenuCache({
      ttlMs: 1_000,
      staleIfErrorMs: 10_000,
      now: () => now
    })
    const gateway = new PizzeriaMenuGateway(
      async (id) => {
        fetches += 1
        if (fetches === 1) {
          return menu(id)
        }
        throw new PizzeriaApiClientError('oven down', { status: 500, kind: 'http' })
      },
      {
        cache,
        scheduler: new UpstreamScheduler({
          concurrency: 1,
          minIntervalMs: 0,
          sleep: async () => undefined
        }),
        sleep: async () => undefined
      }
    )

    assert.deepEqual(await gateway.getMenu('p1'), menu('p1'))
    now = 1_500
    assert.deepEqual(await gateway.getMenu('p1'), menu('p1'))
    assert.equal(fetches, 4)
  })

  test('notes a 429 cooldown on the shared scheduler', async () => {
    const scheduler = new UpstreamScheduler({
      concurrency: 1,
      minIntervalMs: 0,
      defaultCooldownMs: 1_000,
      sleep: async () => undefined
    })
    const original = scheduler.noteRateLimit.bind(scheduler)
    const retryAfter: Array<number | undefined> = []
    scheduler.noteRateLimit = (seconds) => {
      retryAfter.push(seconds)
      original(seconds)
    }

    const gateway = new PizzeriaMenuGateway(
      async () => {
        throw new PizzeriaApiClientError('slow down', {
          status: 429,
          kind: 'http',
          retryAfterSeconds: 2
        })
      },
      {
        scheduler,
        sleep: async () => undefined
      }
    )

    await assert.rejects(gateway.getMenu('p1'), PizzeriaApiClientError)
    assert.deepEqual(retryAfter, [2, 2, 2])
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
