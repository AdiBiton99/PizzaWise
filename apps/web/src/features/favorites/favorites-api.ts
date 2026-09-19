import type { FavoritePizza, PizzaConfiguration } from '@pizzawise/shared'
import { readErrorMessage } from '../account/auth-api'

export type FavoritesErrorCode =
  | 'unauthorized'
  | 'invalid'
  | 'not-found'
  | 'invalid-response'
  | 'request-failed'

export class FavoritesRequestError extends Error {
  readonly code: FavoritesErrorCode

  constructor (code: FavoritesErrorCode, message: string) {
    super(message)
    this.name = 'FavoritesRequestError'
    this.code = code
  }
}

type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type ListFavorites = () => Promise<readonly FavoritePizza[]>
export type CreateFavorite = (
  name: string,
  configuration: PizzaConfiguration
) => Promise<FavoritePizza>
export type UpdateFavorite = (
  id: string,
  name: string,
  configuration: PizzaConfiguration
) => Promise<FavoritePizza>
export type DeleteFavorite = (id: string) => Promise<void>

export async function listFavorites (
  fetch: HttpFetch = globalThis.fetch
): Promise<readonly FavoritePizza[]> {
  const response = await request('/api/favorites', { method: 'GET' }, fetch)

  if (!response.ok) {
    throw await toFavoritesError(response, 'Could not load favorites.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new FavoritesRequestError(
      'invalid-response',
      'Favorites returned invalid JSON.'
    )
  }

  if (!isFavoritesList(payload)) {
    throw new FavoritesRequestError(
      'invalid-response',
      'Favorites returned an invalid response.'
    )
  }

  return payload.favorites
}

export async function createFavorite (
  name: string,
  configuration: PizzaConfiguration,
  fetch: HttpFetch = globalThis.fetch
): Promise<FavoritePizza> {
  const response = await request(
    '/api/favorites',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFavoriteBody(name, configuration))
    },
    fetch
  )

  if (!response.ok) {
    throw await toFavoritesError(response, 'Could not save the favorite.')
  }

  return await readFavorite(response)
}

export async function updateFavorite (
  id: string,
  name: string,
  configuration: PizzaConfiguration,
  fetch: HttpFetch = globalThis.fetch
): Promise<FavoritePizza> {
  const response = await request(
    `/api/favorites/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFavoriteBody(name, configuration))
    },
    fetch
  )

  if (!response.ok) {
    throw await toFavoritesError(response, 'Could not update the favorite.')
  }

  return await readFavorite(response)
}

export async function deleteFavorite (
  id: string,
  fetch: HttpFetch = globalThis.fetch
): Promise<void> {
  const response = await request(
    `/api/favorites/${id}`,
    { method: 'DELETE' },
    fetch
  )

  if (!response.ok) {
    throw await toFavoritesError(response, 'Could not delete the favorite.')
  }
}

function toFavoriteBody (
  name: string,
  configuration: PizzaConfiguration
): {
  name: string
  sizeTag: string
  crustTag: string
  sauceTag: string
  toppingTags: string[]
} {
  return {
    name,
    sizeTag: configuration.sizeTag,
    crustTag: configuration.crustTag,
    sauceTag: configuration.sauceTag,
    toppingTags: [...configuration.toppingTags]
  }
}

async function request (
  url: string,
  init: RequestInit,
  fetch: HttpFetch
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...init.headers
      }
    })
  } catch {
    throw new FavoritesRequestError(
      'request-failed',
      'Favorites service could not be reached.'
    )
  }
}

async function toFavoritesError (
  response: Response,
  fallback: string
): Promise<FavoritesRequestError> {
  const message = await readErrorMessage(response, fallback)

  if (response.status === 401) {
    return new FavoritesRequestError('unauthorized', message)
  }

  if (response.status === 404) {
    return new FavoritesRequestError('not-found', message)
  }

  if (response.status === 400) {
    return new FavoritesRequestError('invalid', message)
  }

  return new FavoritesRequestError('request-failed', message)
}

async function readFavorite (response: Response): Promise<FavoritePizza> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new FavoritesRequestError(
      'invalid-response',
      'Favorites returned invalid JSON.'
    )
  }

  if (!isFavoritePizza(payload)) {
    throw new FavoritesRequestError(
      'invalid-response',
      'Favorites returned an invalid response.'
    )
  }

  return payload
}

function isFavoritesList (
  value: unknown
): value is { favorites: FavoritePizza[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'favorites' in value &&
    Array.isArray(value.favorites) &&
    value.favorites.every(isFavoritePizza)
  )
}

function isFavoritePizza (value: unknown): value is FavoritePizza {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    typeof record.id !== 'string' ||
    record.id.length === 0 ||
    typeof record.name !== 'string' ||
    typeof record.configuration !== 'object' ||
    record.configuration === null
  ) {
    return false
  }

  const configuration = record.configuration as Record<string, unknown>
  return (
    typeof configuration.sizeTag === 'string' &&
    typeof configuration.crustTag === 'string' &&
    typeof configuration.sauceTag === 'string' &&
    Array.isArray(configuration.toppingTags) &&
    configuration.toppingTags.every((tag) => typeof tag === 'string')
  )
}
