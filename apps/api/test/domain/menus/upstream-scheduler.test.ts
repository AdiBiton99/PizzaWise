import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { UpstreamScheduler } from '../../../src/domain/menus/index.js'

describe('UpstreamScheduler', () => {
  test('uses two concurrent slots by default', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const started: number[] = []
    const gates = [0, 1, 2].map(() => createDeferred())
    const scheduler = new UpstreamScheduler({
      minIntervalMs: 0,
      sleep: async () => undefined
    })

    const jobs = [0, 1, 2].map((index) =>
      scheduler.schedule(async () => {
        started.push(index)
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await gates[index]!.promise
        inFlight -= 1
        return index
      })
    )

    await waitUntil(() => started.length === 2)
    assert.deepEqual(started, [0, 1])
    assert.equal(maxInFlight, 2)
    assert.equal(scheduler.inFlight, 2)

    gates[0]!.resolve()
    await waitUntil(() => started.length === 3)
    gates[1]!.resolve()
    gates[2]!.resolve()

    assert.deepEqual(await Promise.all(jobs), [0, 1, 2])
    assert.equal(maxInFlight, 2)
  })

  test('does not exceed the concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const started: number[] = []
    const gates = [0, 1, 2].map(() => createDeferred())
    const scheduler = new UpstreamScheduler({
      concurrency: 2,
      minIntervalMs: 0,
      sleep: async () => undefined
    })

    const jobs = [0, 1, 2].map((index) =>
      scheduler.schedule(async () => {
        started.push(index)
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await gates[index]!.promise
        inFlight -= 1
        return index
      })
    )

    await waitUntil(() => started.length === 2)
    assert.deepEqual(started, [0, 1])
    assert.equal(maxInFlight, 2)
    assert.equal(scheduler.inFlight, 2)

    gates[0]!.resolve()
    await waitUntil(() => started.length === 3)
    gates[1]!.resolve()
    gates[2]!.resolve()

    assert.deepEqual(await Promise.all(jobs), [0, 1, 2])
    assert.equal(maxInFlight, 2)
  })

  test('releases a slot before a later job starts', async () => {
    const order: string[] = []
    const scheduler = new UpstreamScheduler({
      concurrency: 1,
      minIntervalMs: 0,
      sleep: async () => undefined
    })

    const first = scheduler.schedule(async () => {
      order.push('first-start')
      order.push('first-end')
      return 'first'
    })
    const second = scheduler.schedule(async () => {
      order.push('second-start')
      return 'second'
    })

    assert.deepEqual(await Promise.all([first, second]), ['first', 'second'])
    assert.deepEqual(order, ['first-start', 'first-end', 'second-start'])
  })

  test('waits for a 429 cooldown before starting the next job', async () => {
    const started: string[] = []
    const sleeps: number[] = []
    const scheduler = new UpstreamScheduler({
      concurrency: 1,
      minIntervalMs: 0,
      defaultCooldownMs: 1_000,
      sleep: async (ms) => {
        sleeps.push(ms)
      }
    })

    await scheduler.schedule(async () => {
      started.push('first')
      scheduler.noteRateLimit()
      return 'first'
    })
    await scheduler.schedule(async () => {
      started.push('second')
      return 'second'
    })

    assert.deepEqual(started, ['first', 'second'])
    assert.ok(sleeps.some((ms) => ms >= 900))
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

async function waitUntil (isReady: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (isReady()) {
      return
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    })
  }
  throw new Error('Timed out waiting for scheduler progress')
}
