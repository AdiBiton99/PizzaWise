import type {
  GeocodingProvider
} from '../../src/domain/geocoding/index.js'
import {
  GeocodingProviderError
} from '../../src/domain/geocoding/index.js'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { build } from '../helper.js'

describe('manual location route', () => {
  test('trims a query and returns canonical search results', async (t) => {
    let receivedQuery: string | undefined
    let receivedLimit: number | undefined
    const provider: GeocodingProvider = {
      async search (query, limit) {
        receivedQuery = query
        receivedLimit = limit
        return [
          {
            label: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel',
            location: {
              latitude: 32.0809,
              longitude: 34.7806
            }
          }
        ]
      },
      async reverse () {
        throw new Error('Provider should not reverse')
      }
    }
    const app = await build(t, { geocodingProvider: provider })

    const response = await app.inject({
      method: 'POST',
      url: '/api/locations/search',
      payload: {
        query: '  Dizengoff 100, Tel Aviv  '
      }
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['cache-control'], 'no-store')
    assert.equal(receivedQuery, 'Dizengoff 100, Tel Aviv')
    assert.equal(receivedLimit, 5)
    assert.deepEqual(response.json(), {
      results: [
        {
          label: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel',
          location: {
            latitude: 32.0809,
            longitude: 34.7806
          }
        }
      ]
    })
  })

  test('rejects missing, empty, and oversized queries', async (t) => {
    const provider = unusedProvider()
    const app = await build(t, { geocodingProvider: provider })

    for (const payload of [{}, { query: '   ' }, { query: 'a'.repeat(201) }]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/locations/search',
        payload
      })

      assert.equal(response.statusCode, 400)
    }
  })

  test('returns an empty result list without treating it as an error', async (t) => {
    const provider: GeocodingProvider = {
      async search () {
        return []
      },
      async reverse () {
        throw new Error('Provider should not reverse')
      }
    }
    const app = await build(t, { geocodingProvider: provider })

    const response = await app.inject({
      method: 'POST',
      url: '/api/locations/search',
      payload: { query: 'Unknown place' }
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { results: [] })
  })

  test('translates provider failures without exposing details', async (t) => {
    const provider = failingProvider(
      new GeocodingProviderError(
        'invalid-response',
        'raw Geoapify response detail'
      )
    )
    const app = await build(t, { geocodingProvider: provider })

    const response = await app.inject({
      method: 'POST',
      url: '/api/locations/search',
      payload: { query: 'Tel Aviv' }
    })

    assert.equal(response.statusCode, 502)
    assert.equal(response.json().message, 'Location search service unavailable')
    assert.doesNotMatch(response.body, /raw Geoapify response detail/)
  })

  test('translates rate limits and preserves safe Retry-After', async (t) => {
    const provider = failingProvider(
      new GeocodingProviderError('rate-limited', 'provider detail', 30)
    )
    const app = await build(t, { geocodingProvider: provider })

    const response = await app.inject({
      method: 'POST',
      url: '/api/locations/search',
      payload: { query: 'Tel Aviv' }
    })

    assert.equal(response.statusCode, 429)
    assert.equal(response.headers['retry-after'], '30')
    assert.doesNotMatch(response.body, /provider detail/)
  })

  test('reverse-geocodes coordinates into a canonical address label', async (t) => {
    let receivedLatitude: number | undefined
    let receivedLongitude: number | undefined
    const provider: GeocodingProvider = {
      async search () {
        throw new Error('Provider should not search')
      },
      async reverse (location) {
        receivedLatitude = location.latitude
        receivedLongitude = location.longitude
        return {
          label: 'Rothschild Boulevard, Tel Aviv-Yafo, Israel',
          location: {
            latitude: 32.065,
            longitude: 34.771
          }
        }
      }
    }
    const app = await build(t, { geocodingProvider: provider })

    const response = await app.inject({
      method: 'POST',
      url: '/api/locations/reverse',
      payload: {
        latitude: 32.0809,
        longitude: 34.7806
      }
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.headers['cache-control'], 'no-store')
    assert.equal(receivedLatitude, 32.0809)
    assert.equal(receivedLongitude, 34.7806)
    assert.deepEqual(response.json(), {
      result: {
        label: 'Rothschild Boulevard, Tel Aviv-Yafo, Israel',
        location: {
          latitude: 32.065,
          longitude: 34.771
        }
      }
    })
  })

  test('returns a null reverse result without treating it as an error', async (t) => {
    const provider: GeocodingProvider = {
      async search () {
        throw new Error('Provider should not search')
      },
      async reverse () {
        return null
      }
    }
    const app = await build(t, { geocodingProvider: provider })

    const response = await app.inject({
      method: 'POST',
      url: '/api/locations/reverse',
      payload: {
        latitude: 32.0809,
        longitude: 34.7806
      }
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { result: null })
  })
})

function unusedProvider (): GeocodingProvider {
  return {
    async search () {
      throw new Error('Provider should not be called')
    },
    async reverse () {
      throw new Error('Provider should not be called')
    }
  }
}

function failingProvider (error: Error): GeocodingProvider {
  return {
    async search () {
      throw error
    },
    async reverse () {
      throw error
    }
  }
}
