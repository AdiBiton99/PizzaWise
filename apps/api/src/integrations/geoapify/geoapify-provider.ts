import type { LocationSearchResult } from '@pizzawise/shared'
import {
  type GeocodingProvider,
  GeocodingProviderError
} from '../../domain/geocoding/index.js'
import { geoapifySearchResponseSchema } from './external-schema.js'
import {
  defaultUpstreamSleep,
  parseRetryAfterSeconds,
  upstreamDelayMs,
  withUpstreamRetries,
  type UpstreamLogWarn,
  type UpstreamSleep
} from '../upstream-retry.js'

const GEOAPIFY_SEARCH_URL =
  'https://api.geoapify.com/v1/geocode/search'
const DEFAULT_TIMEOUT_MS = 8_000

type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export interface GeoapifyConfig {
  readonly apiKey: string
}

export interface GeoapifyProviderOptions {
  readonly fetch?: HttpFetch
  readonly timeoutMs?: number
  readonly warn?: UpstreamLogWarn
  readonly sleep?: UpstreamSleep
}

export class GeoapifyProvider implements GeocodingProvider {
  readonly #apiKey: string
  readonly #fetch: HttpFetch
  readonly #timeoutMs: number
  readonly #warn: UpstreamLogWarn | undefined
  readonly #sleep: UpstreamSleep

  constructor (
    config: GeoapifyConfig,
    options: GeoapifyProviderOptions = {}
  ) {
    this.#apiKey = config.apiKey
    this.#fetch = options.fetch ?? globalThis.fetch
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.#warn = options.warn
    this.#sleep = options.sleep ?? defaultUpstreamSleep

    if (this.#apiKey.length === 0) {
      throw new GeocodingProviderError(
        'unavailable',
        'Geoapify API key must be configured'
      )
    }

    if (!Number.isSafeInteger(this.#timeoutMs) || this.#timeoutMs <= 0) {
      throw new GeocodingProviderError(
        'unavailable',
        'Geoapify timeout must be a positive safe integer'
      )
    }
  }

  async search (
    query: string,
    limit: number
  ): Promise<readonly LocationSearchResult[]> {
    if (query.length === 0 || !Number.isSafeInteger(limit) || limit <= 0) {
      throw new GeocodingProviderError(
        'unavailable',
        'Invalid Geoapify search parameters'
      )
    }

    return await withUpstreamRetries({
      sleep: this.#sleep,
      isRetryable: isRetryableGeoapifyError,
      delayMs: (error, failedAttemptIndex) =>
        upstreamDelayMs(
          error instanceof GeocodingProviderError
            ? error.retryAfterSeconds
            : undefined,
          failedAttemptIndex
        ),
      onFailure: (error, attempt, willRetry) => {
        this.#logFailure(error, attempt, willRetry)
      },
      operation: async () => await this.#searchOnce(query, limit)
    })
  }

  async #searchOnce (
    query: string,
    limit: number
  ): Promise<readonly LocationSearchResult[]> {
    const url = new URL(GEOAPIFY_SEARCH_URL)
    url.searchParams.set('text', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('apiKey', this.#apiKey)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs)

    try {
      const response = await this.#fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: controller.signal
      })

      if (response.status === 429) {
        throw new GeocodingProviderError(
          'rate-limited',
          'Geoapify rate limit exceeded',
          parseRetryAfterSeconds(response.headers.get('Retry-After'))
        )
      }

      if (response.status >= 400 && response.status < 500) {
        throw new GeocodingProviderError(
          'invalid-response',
          'Geoapify request failed'
        )
      }

      if (!response.ok) {
        throw new GeocodingProviderError(
          'unavailable',
          'Geoapify request failed'
        )
      }

      let rawResponse: unknown
      try {
        rawResponse = await response.json()
      } catch {
        throw new GeocodingProviderError(
          'invalid-response',
          'Geoapify returned invalid JSON'
        )
      }

      const result = geoapifySearchResponseSchema.safeParse(rawResponse)
      if (!result.success) {
        throw new GeocodingProviderError(
          'invalid-response',
          'Geoapify returned an invalid response'
        )
      }

      return result.data.results.map((candidate) => ({
        label: candidate.formatted,
        location: {
          latitude: candidate.lat,
          longitude: candidate.lon
        }
      }))
    } catch (error) {
      if (error instanceof GeocodingProviderError) {
        throw error
      }

      if (controller.signal.aborted) {
        throw new GeocodingProviderError(
          'unavailable',
          'Geoapify request timed out'
        )
      }

      if (isAbortError(error)) {
        throw new GeocodingProviderError(
          'invalid-response',
          'Geoapify request was cancelled'
        )
      }

      throw new GeocodingProviderError(
        'unavailable',
        'Geoapify request failed'
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  #logFailure (
    error: unknown,
    attempt: number,
    willRetry: boolean
  ): void {
    if (this.#warn === undefined) {
      return
    }

    const fields: Record<string, unknown> = {
      operation: 'geoapify.search',
      attempt,
      willRetry,
      errorName: error instanceof Error ? error.name : 'UnknownError'
    }

    if (error instanceof GeocodingProviderError) {
      fields.kind = error.kind
    }

    this.#warn(
      fields,
      willRetry
        ? 'Retrying Geoapify request'
        : 'Geoapify request failed'
    )
  }
}

export function createGeoapifyProviderFromEnv (
  environment: NodeJS.ProcessEnv = process.env,
  options: GeoapifyProviderOptions = {}
): GeoapifyProvider {
  const apiKey = environment.GEOAPIFY_API_KEY
  if (apiKey === undefined || apiKey.length === 0) {
    throw new GeocodingProviderError(
      'unavailable',
      'GEOAPIFY_API_KEY must be configured'
    )
  }

  return new GeoapifyProvider({ apiKey }, options)
}

export function isRetryableGeoapifyError (error: unknown): boolean {
  if (!(error instanceof GeocodingProviderError)) {
    return false
  }

  return error.kind === 'rate-limited' || error.kind === 'unavailable'
}

function isAbortError (error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
