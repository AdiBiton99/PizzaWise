import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { mapWithConcurrency } from '../../../src/domain/menus/index.js'

describe('mapWithConcurrency', () => {
  test('returns an empty list without calling the mapper', async () => {
    let mapperCalls = 0

    const results = await mapWithConcurrency([], 4, async (item) => {
      mapperCalls += 1
      return item
    })

    assert.deepEqual(results, [])
    assert.equal(mapperCalls, 0)
  })

  test('rejects an invalid concurrency limit before mapping', async () => {
    let mapperCalls = 0
    const mapper = async (item: string): Promise<string> => {
      mapperCalls += 1
      return item
    }

    for (const concurrency of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await assert.rejects(
        async () => await mapWithConcurrency(['a'], concurrency, mapper),
        RangeError
      )
      await assert.rejects(
        async () => await mapWithConcurrency([], concurrency, mapper),
        RangeError
      )
    }

    assert.equal(mapperCalls, 0)
  })

  test('preserves input order when later items finish first', async () => {
    const releaseFirst = createDeferred()

    const resultsPromise = mapWithConcurrency(
      ['first', 'second'],
      2,
      async (item) => {
        if (item === 'first') {
          await releaseFirst.promise
        }
        return item
      }
    )

    const results = await Promise.race([
      resultsPromise,
      Promise.resolve('pending')
    ])
    assert.equal(results, 'pending')

    releaseFirst.resolve()
    assert.deepEqual(await resultsPromise, ['first', 'second'])
  })

  test('does not exceed the concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const twoStarted = createDeferred()
    const gates = [0, 1, 2, 3, 4].map(() => createDeferred())

    const resultsPromise = mapWithConcurrency(
      [0, 1, 2, 3, 4],
      2,
      async (item, index) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        if (inFlight === 2) {
          twoStarted.resolve()
        }
        await gates[index]!.promise
        inFlight -= 1
        return item
      }
    )

    await twoStarted.promise
    assert.equal(inFlight, 2)
    assert.equal(maxInFlight, 2)

    for (const gate of gates) {
      gate.resolve()
    }

    assert.deepEqual(await resultsPromise, [0, 1, 2, 3, 4])
    assert.equal(maxInFlight, 2)
  })

  test('lets other workers continue while one request stays slow', async () => {
    const started: string[] = []
    const slow = createDeferred()
    const fastFinished = createDeferred()
    const nextStarted = createDeferred()

    const resultsPromise = mapWithConcurrency(
      ['slow', 'fast', 'next'],
      2,
      async (item) => {
        started.push(item)
        if (item === 'slow') {
          await slow.promise
          return item
        }
        if (item === 'fast') {
          fastFinished.resolve()
          return item
        }
        nextStarted.resolve()
        return item
      }
    )

    await fastFinished.promise
    await nextStarted.promise
    assert.deepEqual(started, ['slow', 'fast', 'next'])
    assert.equal(await Promise.race([resultsPromise, Promise.resolve('pending')]), 'pending')

    slow.resolve()
    assert.deepEqual(await resultsPromise, ['slow', 'fast', 'next'])
  })
})

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
