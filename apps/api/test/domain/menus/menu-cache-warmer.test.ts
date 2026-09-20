import type { Menu, Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DEFAULT_MENU_CACHE_WARM_INTERVAL_MS,
  DEFAULT_MENU_CACHE_WARM_RETRY_MAX_MS,
  DEFAULT_MENU_CACHE_WARM_RETRY_MIN_MS,
  MenuCacheWarmer
} from '../../../src/domain/menus/index.js'

describe('MenuCacheWarmer', () => {
  test('refreshes on a four-minute interval by default', () => {
    assert.equal(DEFAULT_MENU_CACHE_WARM_INTERVAL_MS, 4 * 60_000)
    assert.equal(DEFAULT_MENU_CACHE_WARM_RETRY_MIN_MS, 5_000)
    assert.equal(DEFAULT_MENU_CACHE_WARM_RETRY_MAX_MS, 60_000)
  })

  test('fetches pizzerias then warms every menu', async () => {
    const requested: string[] = []
    const warmer = new MenuCacheWarmer({
      async getPizzerias () {
        return [pizzeria('p1'), pizzeria('p2')]
      },
      async getMenu (id) {
        requested.push(id)
        return menu(id)
      }
    })

    await warmer.runOnce()
    assert.deepEqual(requested.sort(), ['p1', 'p2'])
  })

  test('isolates menu failures and logs completion counts', async () => {
    const infos: Array<{ fields: Record<string, unknown>, message: string }> = []
    const warmer = new MenuCacheWarmer(
      {
        async getPizzerias () {
          return [pizzeria('p-ok'), pizzeria('p-fail')]
        },
        async getMenu (id) {
          if (id === 'p-fail') {
            throw new Error('sensitive upstream detail')
          }
          return menu(id)
        }
      },
      {
        info (fields, message) {
          infos.push({ fields, message })
        }
      }
    )

    await warmer.runOnce()
    assert.equal(infos.length, 2)
    assert.deepEqual(infos[0], {
      fields: { event: 'menu-cache-warm' },
      message: 'Background menu cache warm started'
    })
    assert.equal(infos[1]?.message, 'Background menu cache warm completed')
    assert.equal(infos[1]?.fields.event, 'menu-cache-warm')
    assert.equal(infos[1]?.fields.cachedMenuCount, 1)
    assert.equal(infos[1]?.fields.failedMenuCount, 1)
    assert.equal(infos[1]?.fields.pizzeriaCount, 2)
    assert.equal(typeof infos[1]?.fields.durationMs, 'number')
    assert.ok((infos[1]?.fields.durationMs as number) >= 0)
  })

  test('logs a list failure without crashing or retrying when not started', async () => {
    const warnings: Array<{ fields: Record<string, unknown>, message: string }> = []
    const warmer = new MenuCacheWarmer(
      {
        async getPizzerias () {
          throw new Error('directory down')
        },
        async getMenu () {
          throw new Error('should not be called')
        }
      },
      {
        warn (fields, message) {
          warnings.push({ fields, message })
        }
      }
    )

    await warmer.runOnce()
    assert.deepEqual(warnings, [
      {
        fields: {
          event: 'menu-cache-warm',
          errorName: 'Error'
        },
        message: 'Background menu cache warm failed'
      }
    ])
  })

  test('retries directory failures with bounded backoff until a warm succeeds', async () => {
    let attempts = 0
    const retryDelays: number[] = []
    let completed = false
    const warmer = new MenuCacheWarmer(
      {
        async getPizzerias () {
          attempts += 1
          if (attempts < 3) {
            throw new Error('directory down')
          }
          return [pizzeria('p1')]
        },
        async getMenu (id) {
          return menu(id)
        }
      },
      {
        intervalMs: 5_000,
        retryMinMs: 20,
        retryMaxMs: 40,
        warn (fields) {
          if (typeof fields.retryDelayMs === 'number') {
            retryDelays.push(fields.retryDelayMs)
          }
        },
        info (_fields, message) {
          if (message === 'Background menu cache warm completed') {
            completed = true
          }
        }
      }
    )

    warmer.start()
    await waitUntil(() => completed)
    warmer.stop()

    assert.equal(attempts, 3)
    assert.deepEqual(retryDelays, [20, 40])
  })

  test('after a successful warm, uses the periodic refresh instead of retry backoff', async () => {
    let attempts = 0
    const retryDelays: number[] = []
    const warmer = new MenuCacheWarmer(
      {
        async getPizzerias () {
          attempts += 1
          return []
        },
        async getMenu () {
          throw new Error('should not be called')
        }
      },
      {
        intervalMs: 25,
        retryMinMs: 5,
        retryMaxMs: 5,
        warn (fields) {
          if (typeof fields.retryDelayMs === 'number') {
            retryDelays.push(fields.retryDelayMs)
          }
        }
      }
    )

    warmer.start()
    await waitUntil(() => attempts >= 2)
    warmer.stop()

    assert.ok(attempts >= 2)
    assert.deepEqual(retryDelays, [])
  })

  test('stop cancels a pending directory retry', async () => {
    let attempts = 0
    const warmer = new MenuCacheWarmer(
      {
        async getPizzerias () {
          attempts += 1
          throw new Error('directory down')
        },
        async getMenu () {
          throw new Error('should not be called')
        }
      },
      { retryMinMs: 20, retryMaxMs: 20, intervalMs: 5_000 }
    )

    warmer.start()
    await waitUntil(() => attempts >= 1)
    warmer.stop()
    const stoppedAt = attempts
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })
    assert.equal(attempts, stoppedAt)
  })

  test('skips overlapping warm jobs', async () => {
    let runs = 0
    const started = createDeferred()
    const release = createDeferred()
    const warmer = new MenuCacheWarmer({
      async getPizzerias () {
        runs += 1
        started.resolve()
        await release.promise
        return []
      },
      async getMenu () {
        throw new Error('should not be called')
      }
    })

    const first = warmer.runOnce()
    await started.promise
    await warmer.runOnce()
    release.resolve()
    await first

    assert.equal(runs, 1)
  })

  test('starts immediately, refreshes on the interval, and stops cleanly', async () => {
    let runs = 0
    const warmer = new MenuCacheWarmer(
      {
        async getPizzerias () {
          runs += 1
          return []
        },
        async getMenu () {
          throw new Error('should not be called')
        }
      },
      { intervalMs: 20 }
    )

    warmer.start()
    await waitUntil(() => runs >= 1)
    await waitUntil(() => runs >= 2)
    warmer.stop()
    const stoppedAt = runs
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })
    assert.ok(stoppedAt >= 2)
    assert.equal(runs, stoppedAt)
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

async function waitUntil (isReady: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (isReady()) {
      return
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    })
  }
  throw new Error('Timed out waiting for warmer progress')
}
