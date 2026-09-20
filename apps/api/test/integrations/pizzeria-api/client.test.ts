import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createPizzeriaApiClientFromEnv,
  type HttpFetch,
  loadPizzeriaApiClientConfig,
  PizzeriaApiAdapterError,
  PizzeriaApiClient,
  PizzeriaApiClientError
} from '../../../src/integrations/pizzeria-api/index.js'

const TEST_CONFIG = {
  baseUrl: 'https://pizzeria.test/api/',
  apiKey: 'test-api-key'
}

function jsonResponse (body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

describe('PizzeriaApiClient configuration', () => {
  test('loads the required environment variables', () => {
    assert.deepEqual(
      loadPizzeriaApiClientConfig({
        PIZZERIA_API_BASE_URL: 'https://pizzeria.test/api',
        PIZZERIA_API_KEY: 'test-api-key'
      }),
      TEST_CONFIG
    )
  })

  test('rejects missing or invalid configuration without exposing a key', () => {
    assert.throws(
      () => loadPizzeriaApiClientConfig({}),
      /PIZZERIA_API_BASE_URL must be configured/
    )

    assert.throws(
      () =>
        loadPizzeriaApiClientConfig({
          PIZZERIA_API_BASE_URL: 'not-a-url',
          PIZZERIA_API_KEY: 'secret-value'
        }),
      (error) => {
        assert.ok(error instanceof PizzeriaApiClientError)
        assert.doesNotMatch(error.message, /secret-value/)
        return true
      }
    )
  })
})

describe('PizzeriaApiClient requests', () => {
  test('requests and normalizes the pizzeria list', async () => {
    const fetch: HttpFetch = async (input, init) => {
      assert.equal(input.toString(), 'https://pizzeria.test/api/pizzerias')
      assert.equal(init?.method, 'GET')
      assert.equal(
        new Headers(init?.headers).get('X-API-Key'),
        'test-api-key'
      )
      assert.equal(new Headers(init?.headers).get('Accept'), 'application/json')
      assert.ok(init?.signal instanceof AbortSignal)

      return jsonResponse({
        count: 1,
        pizzerias: [
          {
            id: 'p2',
            name: 'Funghi Bros',
            lat: 32.0809,
            lng: 34.7806,
            avgEtaMinutes: '40-50'
          }
        ]
      })
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, { fetch })

    assert.deepEqual(await client.getPizzerias(), [
      {
        id: 'p2',
        name: 'Funghi Bros',
        latitude: 32.0809,
        longitude: 34.7806,
        averageEta: {
          minMinutes: 40,
          maxMinutes: 50
        }
      }
    ])
  })

  test('requests an encoded pizzeria menu and returns a canonical menu', async () => {
    const fetch: HttpFetch = async (input) => {
      assert.equal(
        input.toString(),
        'https://pizzeria.test/api/pizzerias/p2%2Fbranch/menu'
      )

      return jsonResponse({
        pizzeria_id: 'p2/branch',
        currency: 'ILS',
        price_unit: 'decimal',
        sizes: [{ id: 'sm', label: 'S', price: 33.9 }],
        crusts: [{ id: 'classic', label: 'Classic', price: 0 }],
        sauces: ['pesto'],
        toppings: [{ id: 'x9', name: 'funghi', price: 4.5 }]
      })
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, { fetch })
    const menu = await client.getMenu('p2/branch')

    assert.equal(menu.pizzeriaId, 'p2/branch')
    assert.deepEqual(menu.sizes[0], {
      providerId: 'sm',
      providerName: 'S',
      semanticTag: 'small',
      price: {
        amountMinor: 3390,
        currency: 'ILS'
      }
    })
    assert.deepEqual(menu.toppings[0], {
      providerId: 'x9',
      providerName: 'funghi',
      semanticTag: 'funghi',
      price: {
        amountMinor: 450,
        currency: 'ILS'
      }
    })
  })

  test('creates a client from environment configuration', async () => {
    const fetch: HttpFetch = async () =>
      jsonResponse({ count: 0, pizzerias: [] })

    const client = createPizzeriaApiClientFromEnv(
      {
        PIZZERIA_API_BASE_URL: 'https://pizzeria.test',
        PIZZERIA_API_KEY: 'test-api-key'
      },
      { fetch }
    )

    assert.deepEqual(await client.getPizzerias(), [])
  })

  test('reports non-successful HTTP responses', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      return jsonResponse({ error: 'internal oven failure' }, 500)
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, {
      fetch,
      sleep: async () => undefined
    })

    await assert.rejects(client.getMenu('p11'), (error) => {
      assert.ok(error instanceof PizzeriaApiClientError)
      assert.equal(error.status, 500)
      assert.match(error.message, /HTTP 500/)
      return true
    })
    assert.equal(attempts, 1)
  })

  test('retries network failures and then succeeds', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      if (attempts < 3) {
        throw new TypeError('fetch failed')
      }

      return jsonResponse({ count: 0, pizzerias: [] })
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, {
      fetch,
      sleep: async () => undefined
    })

    assert.deepEqual(await client.getPizzerias(), [])
    assert.equal(attempts, 3)
  })

  test('does not retry client errors or invalid JSON', async () => {
    let notFoundAttempts = 0
    const notFoundClient = new PizzeriaApiClient(TEST_CONFIG, {
      fetch: async () => {
        notFoundAttempts += 1
        return jsonResponse({ error: 'missing' }, 404)
      },
      sleep: async () => {
        throw new Error('Should not delay a 404')
      }
    })

    await assert.rejects(notFoundClient.getMenu('missing'), (error) => {
      assert.ok(error instanceof PizzeriaApiClientError)
      assert.equal(error.status, 404)
      return true
    })
    assert.equal(notFoundAttempts, 1)

    let invalidJsonAttempts = 0
    const invalidJsonClient = new PizzeriaApiClient(TEST_CONFIG, {
      fetch: async () => {
        invalidJsonAttempts += 1
        return new Response('not-json', { status: 200 })
      },
      sleep: async () => {
        throw new Error('Should not delay invalid JSON')
      }
    })

    await assert.rejects(
      invalidJsonClient.getPizzerias(),
      /Pizzeria API returned invalid JSON/
    )
    assert.equal(invalidJsonAttempts, 1)
  })

  test('passes malformed successful responses to the adapters', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      return jsonResponse({ count: 1, pizzerias: [] })
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, { fetch })

    await assert.rejects(client.getPizzerias(), PizzeriaApiAdapterError)
    assert.equal(attempts, 1)
  })

  test('does not retry non-timeout aborts', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      throw new DOMException('The operation was aborted.', 'AbortError')
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, {
      fetch,
      sleep: async () => {
        throw new Error('Should not delay a cancelled request')
      }
    })

    await assert.rejects(client.getPizzerias(), (error) => {
      assert.ok(error instanceof PizzeriaApiClientError)
      assert.equal(error.kind, 'aborted')
      return true
    })
    assert.equal(attempts, 1)
  })

  test('aborts requests that exceed the configured timeout', async () => {
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
      return jsonResponse({ count: 0, pizzerias: [] })
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, {
      fetch,
      timeoutMs: 5,
      sleep: async () => undefined
    })

    await assert.rejects(client.getPizzerias(), /timed out after 5ms/)
    assert.equal(attempts, 3)
  })

  test('retries 429 using a capped Retry-After and then succeeds', async () => {
    let attempts = 0
    const delays: number[] = []
    const warnings: Array<{ fields: Record<string, unknown>, message: string }> = []
    const fetch: HttpFetch = async () => {
      attempts += 1
      if (attempts < 3) {
        return new Response('', {
          status: 429,
          headers: { 'Retry-After': '45' }
        })
      }

      return jsonResponse({ count: 0, pizzerias: [] })
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, {
      fetch,
      sleep: async (ms) => {
        delays.push(ms)
      },
      warn: (fields, message) => {
        warnings.push({ fields, message })
      }
    })

    assert.deepEqual(await client.getPizzerias(), [])
    assert.equal(attempts, 3)
    assert.deepEqual(delays, [2000, 2000])
    assert.equal(warnings.length, 2)
    assert.equal(warnings[0]?.fields.operation, 'getPizzerias')
    assert.equal(warnings[0]?.fields.status, 429)
    assert.equal(warnings[0]?.fields.willRetry, true)
    assert.doesNotMatch(JSON.stringify(warnings), /test-api-key|pizzeria\.test/)
  })

  test('does not retry malformed upstream payloads', async () => {
    let attempts = 0
    const fetch: HttpFetch = async () => {
      attempts += 1
      return jsonResponse({ count: 1, pizzerias: [] })
    }

    const client = new PizzeriaApiClient(TEST_CONFIG, {
      fetch,
      sleep: async () => {
        throw new Error('Should not delay a malformed payload')
      }
    })

    await assert.rejects(client.getPizzerias(), PizzeriaApiAdapterError)
    assert.equal(attempts, 1)
  })
})
