import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { GeocodingProviderError } from '../../../src/domain/geocoding/index.js'
import {
  createGeoapifyProviderFromEnv,
  GeoapifyProvider,
  type GeoapifyProviderOptions
} from '../../../src/integrations/geoapify/index.js'

type HttpFetch = NonNullable<GeoapifyProviderOptions['fetch']>

describe('GeoapifyProvider', () => {
  test('normalizes a valid forward-geocoding response', async () => {
    const fetch: HttpFetch = async (input, init) => {
      const url = new URL(input.toString())
      assert.equal(
        url.origin + url.pathname,
        'https://api.geoapify.com/v1/geocode/search'
      )
      assert.equal(url.searchParams.get('text'), 'Dizengoff 100, Tel Aviv')
      assert.equal(url.searchParams.get('format'), 'json')
      assert.equal(url.searchParams.get('limit'), '5')
      assert.equal(url.searchParams.get('apiKey'), 'test-key')
      assert.equal(init?.method, 'GET')

      return jsonResponse({
        results: [
          {
            formatted: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel',
            lat: 32.0809,
            lon: 34.7806,
            ignoredVendorField: 'ignored'
          }
        ]
      })
    }

    const provider = new GeoapifyProvider(
      { apiKey: 'test-key' },
      { fetch }
    )

    assert.deepEqual(
      await provider.search('Dizengoff 100, Tel Aviv', 5),
      [
        {
          label: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel',
          location: {
            latitude: 32.0809,
            longitude: 34.7806
          }
        }
      ]
    )
  })

  test('returns an empty list when Geoapify has no results', async () => {
    const provider = providerWithResponse({ results: [] })
    assert.deepEqual(await provider.search('Unknown place', 5), [])
  })

  test('rejects malformed Geoapify responses', async () => {
    const provider = providerWithResponse({
      results: [{ formatted: 'Invalid', lat: 95, lon: 34.8 }]
    })

    await assert.rejects(provider.search('Invalid', 5), (error) => {
      assertProviderError(error, 'invalid-response')
      return true
    })
  })

  test('translates provider server failures', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      return jsonResponse({ message: 'raw provider error' }, 500)
    }
    const provider = new GeoapifyProvider(
      { apiKey: 'test-key' },
      { fetch, sleep: async () => undefined }
    )

    await assert.rejects(provider.search('Tel Aviv', 5), (error) => {
      assertProviderError(error, 'unavailable')
      assert.doesNotMatch(error.message, /raw provider error/)
      return true
    })
    assert.equal(attempts, 3)
  })

  test('does not retry ordinary Geoapify client errors', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      return jsonResponse({ message: 'unauthorized' }, 401)
    }
    const provider = new GeoapifyProvider(
      { apiKey: 'test-key' },
      {
        fetch,
        sleep: async () => {
          throw new Error('Should not delay a Geoapify 4xx')
        }
      }
    )

    await assert.rejects(provider.search('Tel Aviv', 5), (error) => {
      assertProviderError(error, 'invalid-response')
      return true
    })
    assert.equal(attempts, 1)
  })

  test('preserves a sanitized Retry-After value for rate limits', async () => {
    let attempts = 0
    const delays: number[] = []
    const fetch: HttpFetch = async () => {
      attempts += 1
      return new Response('', {
        status: 429,
        headers: {
          'Retry-After': '45'
        }
      })
    }
    const provider = new GeoapifyProvider(
      { apiKey: 'test-key' },
      {
        fetch,
        sleep: async (ms) => {
          delays.push(ms)
        }
      }
    )

    await assert.rejects(provider.search('Tel Aviv', 5), (error) => {
      assertProviderError(error, 'rate-limited')
      assert.equal(error.retryAfterSeconds, 45)
      return true
    })
    assert.equal(attempts, 3)
    assert.deepEqual(delays, [2000, 2000])
  })

  test('reports request timeouts without exposing request details', async () => {
    let attempts = 0
    const fetch: HttpFetch = async (_input, init) => {
      attempts += 1
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(init.signal?.reason),
          { once: true }
        )
      })
      return jsonResponse({ results: [] })
    }
    const provider = new GeoapifyProvider(
      { apiKey: 'test-key' },
      { fetch, timeoutMs: 5, sleep: async () => undefined }
    )

    await assert.rejects(provider.search('Private address', 5), (error) => {
      assertProviderError(error, 'unavailable')
      assert.doesNotMatch(error.message, /Private address|test-key/)
      return true
    })
    assert.equal(attempts, 3)
  })

  test('does not retry malformed Geoapify responses', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      return jsonResponse({
        results: [{ formatted: 'Invalid', lat: 95, lon: 34.8 }]
      })
    }
    const provider = new GeoapifyProvider(
      { apiKey: 'test-key' },
      {
        fetch,
        sleep: async () => {
          throw new Error('Should not delay an invalid Geoapify payload')
        }
      }
    )

    await assert.rejects(provider.search('Invalid', 5), (error) => {
      assertProviderError(error, 'invalid-response')
      return true
    })
    assert.equal(attempts, 1)
  })

  test('requires the Geoapify API key from the environment', () => {
    assert.throws(
      () => createGeoapifyProviderFromEnv({}),
      /GEOAPIFY_API_KEY must be configured/
    )
  })
})

function providerWithResponse (body: unknown): GeoapifyProvider {
  const fetch: HttpFetch = async () => jsonResponse(body)
  return new GeoapifyProvider({ apiKey: 'test-key' }, { fetch })
}

function jsonResponse (body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

function assertProviderError (
  error: unknown,
  kind: GeocodingProviderError['kind']
): asserts error is GeocodingProviderError {
  assert.ok(error instanceof GeocodingProviderError)
  assert.equal(error.kind, kind)
}
