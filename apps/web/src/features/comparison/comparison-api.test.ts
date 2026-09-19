import type { PizzaComparison } from '@pizzawise/shared'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonRequestError, comparePizzas } from './comparison-api'

const REQUEST = {
  location: {
    latitude: 32.0809,
    longitude: 34.7806
  },
  radiusKm: 5,
  configuration: {
    sizeTag: 'medium',
    crustTag: 'thin',
    sauceTag: 'tomato',
    toppingTags: []
  }
} as const

describe('comparePizzas', () => {
  it('posts location, radius, and configuration without a default priority', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/pizzerias/compare')
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({
        location: REQUEST.location,
        radiusKm: 5,
        configuration: REQUEST.configuration
      })

      return jsonResponse({ ranked: [], uncheckedPizzeriaCount: 0 })
    })

    await expect(comparePizzas(REQUEST, fetch)).resolves.toEqual({
      ranked: [],
      uncheckedPizzeriaCount: 0
    })
  })

  it('includes an explicit comparison priority', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        location: REQUEST.location,
        radiusKm: 10,
        configuration: REQUEST.configuration,
        priority: 'distance'
      })

      return jsonResponse({ ranked: [], uncheckedPizzeriaCount: 0 })
    })

    await comparePizzas(
      {
        ...REQUEST,
        radiusKm: 10,
        priority: 'distance'
      },
      fetch
    )
  })

  it('omits radiusKm when searching every listed pizzeria', async () => {
    const fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        location: REQUEST.location,
        configuration: REQUEST.configuration
      })

      return jsonResponse({ ranked: [], uncheckedPizzeriaCount: 0 })
    })

    await comparePizzas(
      {
        location: REQUEST.location,
        configuration: REQUEST.configuration
      },
      fetch
    )
  })

  it('returns ranked results from a canonical response', async () => {
    const comparison: PizzaComparison = {
      ranked: [rankedResult()],
      uncheckedPizzeriaCount: 0
    }
    const fetch = vi.fn(async () => jsonResponse(comparison))

    await expect(comparePizzas(REQUEST, fetch)).resolves.toEqual(comparison)
  })

  it('reports failed and malformed responses', async () => {
    await expect(
      comparePizzas(REQUEST, async () => new Response('', { status: 502 }))
    ).rejects.toMatchObject({ code: 'request-failed' })

    await expect(
      comparePizzas(REQUEST, async () => jsonResponse({ ranked: 'nope' }))
    ).rejects.toBeInstanceOf(ComparisonRequestError)

    await expect(
      comparePizzas(REQUEST, async () => jsonResponse({ ranked: [] }))
    ).rejects.toBeInstanceOf(ComparisonRequestError)
  })
})

function rankedResult () {
  return {
    rank: 1,
    score: 0,
    costs: {
      price: 0,
      distance: 0,
      eta: 0
    },
    nearby: {
      pizzeria: {
        id: 'p2',
        name: 'Funghi Bros',
        latitude: 32.0809,
        longitude: 34.7806,
        averageEta: {
          minMinutes: 12,
          maxMinutes: 20
        }
      },
      distanceKm: 1.23
    },
    selection: {
      size: {
        providerId: 'sz',
        providerName: 'Medium',
        semanticTag: 'medium',
        price: { amountMinor: 3390, currency: 'ILS' }
      },
      crust: {
        providerId: 'cr',
        providerName: 'Thin',
        semanticTag: 'thin',
        price: { amountMinor: 0, currency: 'ILS' }
      },
      sauce: {
        providerName: 'tomato',
        semanticTag: 'tomato'
      },
      toppings: []
    },
    total: {
      amountMinor: 3390,
      currency: 'ILS'
    }
  }
}

function jsonResponse (body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
