import type { LocationSearchResult } from '@pizzawise/shared'

export interface GeocodingProvider {
  search(
    query: string,
    limit: number
  ): Promise<readonly LocationSearchResult[]>
}

export type GeocodingProviderErrorKind =
  | 'invalid-response'
  | 'rate-limited'
  | 'unavailable'

export class GeocodingProviderError extends Error {
  readonly kind: GeocodingProviderErrorKind
  readonly retryAfterSeconds: number | undefined

  constructor (
    kind: GeocodingProviderErrorKind,
    message: string,
    retryAfterSeconds?: number
  ) {
    super(message)
    this.name = 'GeocodingProviderError'
    this.kind = kind
    this.retryAfterSeconds = retryAfterSeconds
  }
}
