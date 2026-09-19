import type { FavoritePizza, PizzaConfiguration } from '@pizzawise/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  FavoritesRequestError,
  createFavorite,
  deleteFavorite,
  listFavorites,
  updateFavorite
} from './favorites-api'

const PIZZA: PizzaConfiguration = {
  sizeTag: 'medium',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['mushroom']
}

const FAVORITE: FavoritePizza = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Weeknight',
  configuration: PIZZA
}

describe('favorites API', () => {
  it('lists favorites with credentials included', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/favorites')
      expect(init?.method).toBe('GET')
      expect(init?.credentials).toBe('include')
      return jsonResponse({ favorites: [FAVORITE] })
    })

    await expect(listFavorites(fetch)).resolves.toEqual([FAVORITE])
  })

  it('creates a favorite with a flattened pizza body', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/favorites')
      expect(init?.method).toBe('POST')
      expect(init?.credentials).toBe('include')
      expect(JSON.parse(String(init?.body))).toEqual({
        name: 'Weeknight',
        sizeTag: 'medium',
        crustTag: 'thin',
        sauceTag: 'tomato',
        toppingTags: ['mushroom']
      })
      return jsonResponse(FAVORITE, 201)
    })

    await expect(createFavorite('Weeknight', PIZZA, fetch)).resolves.toEqual(
      FAVORITE
    )
  })

  it('updates a favorite and maps 404', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe(`/api/favorites/${FAVORITE.id}`)
      expect(init?.method).toBe('PUT')
      expect(init?.credentials).toBe('include')
      return jsonResponse({ message: 'Favorite not found' }, 404)
    })

    await expect(
      updateFavorite(FAVORITE.id, 'Renamed', PIZZA, fetch)
    ).rejects.toMatchObject({
      code: 'not-found',
      message: 'Favorite not found'
    })
  })

  it('deletes a favorite with an empty 204 response', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe(`/api/favorites/${FAVORITE.id}`)
      expect(init?.method).toBe('DELETE')
      expect(init?.credentials).toBe('include')
      return new Response(null, { status: 204 })
    })

    await expect(deleteFavorite(FAVORITE.id, fetch)).resolves.toBeUndefined()
  })

  it('maps 401 to unauthorized', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ message: 'Authentication required' }, 401)
    )

    await expect(listFavorites(fetch)).rejects.toBeInstanceOf(FavoritesRequestError)
    await expect(listFavorites(fetch)).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'Authentication required'
    })
  })
})

function jsonResponse (body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
