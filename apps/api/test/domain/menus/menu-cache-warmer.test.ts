import type { Menu, Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DEFAULT_MENU_CACHE_WARM_INTERVAL_MS,
  MenuCacheWarmer
} from '../../../src/domain/menus/index.js'

describe('MenuCacheWarmer', () => {
  test('refreshes on a four-minute interval by default', () => {
    assert.equal(DEFAULT_MENU_CACHE_WARM_INTERVAL_MS, 4 * 60_000)
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

  test('isolates menu failures and does not throw', async () => {
    const warnings: Array<{ fields: Record<string, unknown>, message: string }> = []
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
          failedMenuCount: 1,
          pizzeriaCount: 2
        },
        message: 'Background menu cache warm completed with menu failures'
      }
    ])
  })

  test('logs a list failure without crashing', async () => {
    const warnings: string[] = []
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
        warn (_fields, message) {
          warnings.push(message)
        }
      }
    )

    await warmer.runOnce()
    assert.deepEqual(warnings, ['Background menu cache warm failed'])
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
