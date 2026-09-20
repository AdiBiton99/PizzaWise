import type { Menu } from '@pizzawise/shared'

export const DEFAULT_MENU_CACHE_TTL_MS = 5 * 60_000
export const DEFAULT_MENU_CACHE_STALE_IF_ERROR_MS = 30 * 60_000

export type MenuCacheClock = () => number

interface MenuCacheEntry {
  readonly menu: Menu
  readonly fetchedAt: number
}

export interface MenuCacheOptions {
  readonly ttlMs?: number
  readonly staleIfErrorMs?: number
  readonly now?: MenuCacheClock
}

export class MenuCache {
  readonly #ttlMs: number
  readonly #staleIfErrorMs: number
  readonly #now: MenuCacheClock
  readonly #entries = new Map<string, MenuCacheEntry>()

  constructor (options: MenuCacheOptions = {}) {
    this.#ttlMs = options.ttlMs ?? DEFAULT_MENU_CACHE_TTL_MS
    this.#staleIfErrorMs = Math.max(
      this.#ttlMs,
      options.staleIfErrorMs ?? DEFAULT_MENU_CACHE_STALE_IF_ERROR_MS
    )
    this.#now = options.now ?? Date.now

    if (!Number.isSafeInteger(this.#ttlMs) || this.#ttlMs <= 0) {
      throw new RangeError('Menu cache TTL must be a positive safe integer')
    }
  }

  getFresh (pizzeriaId: string): Menu | undefined {
    const entry = this.#entries.get(pizzeriaId)
    if (entry === undefined) {
      return undefined
    }

    if (this.#now() >= entry.fetchedAt + this.#ttlMs) {
      return undefined
    }

    return entry.menu
  }

  getStale (pizzeriaId: string): Menu | undefined {
    const entry = this.#entries.get(pizzeriaId)
    if (entry === undefined) {
      return undefined
    }

    if (this.#now() >= entry.fetchedAt + this.#staleIfErrorMs) {
      this.#entries.delete(pizzeriaId)
      return undefined
    }

    return entry.menu
  }

  set (pizzeriaId: string, menu: Menu): void {
    this.#entries.set(pizzeriaId, {
      menu,
      fetchedAt: this.#now()
    })
  }
}
