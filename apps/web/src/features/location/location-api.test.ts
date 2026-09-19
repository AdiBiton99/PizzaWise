import { describe, expect, it, vi } from 'vitest'
import {
  LocationSearchError,
  searchLocations
} from './location-api'

describe('searchLocations', () => {
  it('posts the query to PizzaWise and returns canonical results', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/locations/search')
      expect(init?.method).toBe('POST')
      expect(init?.body).toBe(
        JSON.stringify({ query: 'Dizengoff 100, Tel Aviv' })
      )

      return jsonResponse({
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

    await expect(
      searchLocations('Dizengoff 100, Tel Aviv', fetch)
    ).resolves.toEqual([
      {
        label: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel',
        location: {
          latitude: 32.0809,
          longitude: 34.7806
        }
      }
    ])
  })

  it('returns an empty result list', async () => {
    const fetch = vi.fn(async () => jsonResponse({ results: [] }))
    await expect(searchLocations('Unknown', fetch)).resolves.toEqual([])
  })

  it('reports rate limits separately', async () => {
    const fetch = vi.fn(async () => new Response('', { status: 429 }))

    await expect(searchLocations('Tel Aviv', fetch)).rejects.toMatchObject({
      code: 'rate-limited'
    })
  })

  it('rejects malformed canonical responses', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        results: [
          {
            label: 'Invalid',
            location: {
              latitude: 120,
              longitude: 34.8
            }
          }
        ]
      })
    )

    await expect(searchLocations('Invalid', fetch)).rejects.toBeInstanceOf(
      LocationSearchError
    )
  })
})

function jsonResponse (body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
