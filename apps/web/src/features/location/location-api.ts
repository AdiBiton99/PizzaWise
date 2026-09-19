import type { LocationSearchResult } from '@pizzawise/shared'

export type LocationSearchErrorCode =
  | 'invalid-response'
  | 'rate-limited'
  | 'request-failed'

export class LocationSearchError extends Error {
  readonly code: LocationSearchErrorCode

  constructor (code: LocationSearchErrorCode, message: string) {
    super(message)
    this.name = 'LocationSearchError'
    this.code = code
  }
}

export type SearchLocations = (
  query: string
) => Promise<readonly LocationSearchResult[]>

type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export async function searchLocations (
  query: string,
  fetch: HttpFetch = globalThis.fetch
): Promise<readonly LocationSearchResult[]> {
  let response: Response

  try {
    response = await fetch('/api/locations/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ query })
    })
  } catch {
    throw new LocationSearchError(
      'request-failed',
      'Location search could not be reached.'
    )
  }

  if (response.status === 429) {
    throw new LocationSearchError(
      'rate-limited',
      'Location search is temporarily rate limited.'
    )
  }

  if (!response.ok) {
    throw new LocationSearchError(
      'request-failed',
      'Location search failed.'
    )
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new LocationSearchError(
      'invalid-response',
      'Location search returned invalid JSON.'
    )
  }

  if (!isLocationSearchResponse(body)) {
    throw new LocationSearchError(
      'invalid-response',
      'Location search returned an invalid response.'
    )
  }

  return body.results
}

function isLocationSearchResponse (
  value: unknown
): value is { results: LocationSearchResult[] } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('results' in value) ||
    !Array.isArray(value.results)
  ) {
    return false
  }

  return value.results.every((result) => {
    if (
      typeof result !== 'object' ||
      result === null ||
      !('label' in result) ||
      typeof result.label !== 'string' ||
      result.label.length === 0 ||
      !('location' in result) ||
      typeof result.location !== 'object' ||
      result.location === null
    ) {
      return false
    }

    const location = result.location
    return (
      'latitude' in location &&
      typeof location.latitude === 'number' &&
      Number.isFinite(location.latitude) &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      'longitude' in location &&
      typeof location.longitude === 'number' &&
      Number.isFinite(location.longitude) &&
      location.longitude >= -180 &&
      location.longitude <= 180
    )
  })
}
