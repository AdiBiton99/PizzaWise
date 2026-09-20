import type { Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DirectoryCache,
  PizzeriaDirectoryGateway
} from '../../../src/domain/location/index.js'

describe('PizzeriaDirectoryGateway', () => {
  test('serves a cached directory without refetching', async () => {
    let fetches = 0
    const gateway = new PizzeriaDirectoryGateway(async () => {
      fetches += 1
      return [pizzeria('p1')]
    })

    await gateway.getPizzerias()
    await gateway.getPizzerias()
    assert.equal(fetches, 1)
  })

  test('singleflights concurrent directory lookups', async () => {
    let fetches = 0
    const started = createDeferred()
    const release = createDeferred()
    const gateway = new PizzeriaDirectoryGateway(async () => {
      fetches += 1
      started.resolve()
      await release.promise
      return [pizzeria('p1')]
    })

    const first = gateway.getPizzerias()
    const second = gateway.getPizzerias()
    await started.promise
    release.resolve()

    const [a, b] = await Promise.all([first, second])
    assert.deepEqual(a, [pizzeria('p1')])
    assert.deepEqual(b, [pizzeria('p1')])
    assert.equal(fetches, 1)
  })

  test('returns stale directory when a refresh fails', async () => {
    let now = 0
    let fetches = 0
    const cache = new DirectoryCache({
      ttlMs: 1_000,
      staleIfErrorMs: 5_000,
      now: () => now
    })
    const gateway = new PizzeriaDirectoryGateway(
      async () => {
        fetches += 1
        if (fetches === 2) {
          throw new Error('directory down')
        }
        return [pizzeria('p1')]
      },
      { cache }
    )

    await gateway.getPizzerias()
    now = 1_000
    const stale = await gateway.getPizzerias()
    assert.deepEqual(stale, [pizzeria('p1')])
    assert.equal(fetches, 2)
  })

  test('throws when a refresh fails with no stale directory', async () => {
    const gateway = new PizzeriaDirectoryGateway(async () => {
      throw new Error('directory down')
    })

    await assert.rejects(async () => await gateway.getPizzerias(), /directory down/)
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
