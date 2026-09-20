import type { Pizzeria } from '@pizzawise/shared'

export const DEFAULT_DIRECTORY_CACHE_TTL_MS = 30_000
export const DEFAULT_DIRECTORY_CACHE_STALE_IF_ERROR_MS = 5 * 60_000

export type DirectoryCacheClock = () => number

interface DirectoryCacheEntry {
  readonly pizzerias: readonly Pizzeria[]
  readonly fetchedAt: number
}

export interface DirectoryCacheOptions {
  readonly ttlMs?: number
  readonly staleIfErrorMs?: number
  readonly now?: DirectoryCacheClock
}

export class DirectoryCache {
  readonly #ttlMs: number
  readonly #staleIfErrorMs: number
  readonly #now: DirectoryCacheClock
  #entry: DirectoryCacheEntry | undefined

  constructor (options: DirectoryCacheOptions = {}) {
    this.#ttlMs = options.ttlMs ?? DEFAULT_DIRECTORY_CACHE_TTL_MS
    this.#staleIfErrorMs = Math.max(
      this.#ttlMs,
      options.staleIfErrorMs ?? DEFAULT_DIRECTORY_CACHE_STALE_IF_ERROR_MS
    )
    this.#now = options.now ?? Date.now

    if (!Number.isSafeInteger(this.#ttlMs) || this.#ttlMs <= 0) {
      throw new RangeError('Directory cache TTL must be a positive safe integer')
    }
  }

  getFresh (): readonly Pizzeria[] | undefined {
    if (this.#entry === undefined) {
      return undefined
    }

    if (this.#now() >= this.#entry.fetchedAt + this.#ttlMs) {
      return undefined
    }

    return this.#entry.pizzerias
  }

  getStale (): readonly Pizzeria[] | undefined {
    if (this.#entry === undefined) {
      return undefined
    }

    if (this.#now() >= this.#entry.fetchedAt + this.#staleIfErrorMs) {
      this.#entry = undefined
      return undefined
    }

    return this.#entry.pizzerias
  }

  set (pizzerias: readonly Pizzeria[]): void {
    this.#entry = {
      pizzerias,
      fetchedAt: this.#now()
    }
  }
}
