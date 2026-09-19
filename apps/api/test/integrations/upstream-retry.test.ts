import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  parseRetryAfterSeconds,
  UPSTREAM_RETRY_AFTER_CAP_MS,
  UPSTREAM_RETRY_ATTEMPTS,
  upstreamDelayMs,
  withUpstreamRetries
} from '../../src/integrations/upstream-retry.js'

describe('upstream retries', () => {
  test('retries retryable failures up to three attempts', async () => {
    let attempts = 0
    const delays: number[] = []

    const result = await withUpstreamRetries({
      isRetryable: () => true,
      delayMs: () => 25,
      sleep: async (ms) => {
        delays.push(ms)
      },
      operation: async () => {
        attempts += 1
        if (attempts < UPSTREAM_RETRY_ATTEMPTS) {
          throw new Error(`transient ${attempts}`)
        }
        return 'ok'
      }
    })

    assert.equal(result, 'ok')
    assert.equal(attempts, 3)
    assert.deepEqual(delays, [25, 25])
  })

  test('does not retry non-retryable failures', async () => {
    let attempts = 0

    await assert.rejects(
      withUpstreamRetries({
        isRetryable: () => false,
        delayMs: () => 25,
        sleep: async () => {
          throw new Error('Should not sleep')
        },
        operation: async () => {
          attempts += 1
          throw new Error('permanent')
        }
      }),
      /permanent/
    )
    assert.equal(attempts, 1)
  })

  test('caps Retry-After delays and uses jittered backoff otherwise', () => {
    assert.equal(upstreamDelayMs(45, 0, () => 0), UPSTREAM_RETRY_AFTER_CAP_MS)
    assert.equal(upstreamDelayMs(undefined, 0, () => 0), 0)
    assert.equal(upstreamDelayMs(undefined, 0, () => 1), 201)
    assert.equal(upstreamDelayMs(undefined, 3, () => 1), 1001)
  })

  test('parses Retry-After delta seconds', () => {
    assert.equal(parseRetryAfterSeconds('12'), 12)
    assert.equal(parseRetryAfterSeconds(null), undefined)
    assert.equal(parseRetryAfterSeconds('nope'), undefined)
  })
})
