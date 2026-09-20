import type { Pizzeria } from '@pizzawise/shared'
import {
  DirectoryCache,
  type DirectoryCacheOptions
} from './directory-cache.js'

export interface PizzeriaDirectoryReader {
  getPizzerias(): Promise<Pizzeria[]>
}

export interface PizzeriaDirectoryGatewayOptions {
  readonly cache?: DirectoryCache
  readonly cacheOptions?: DirectoryCacheOptions
}

export class PizzeriaDirectoryGateway {
  readonly #fetchPizzerias: PizzeriaDirectoryReader['getPizzerias']
  readonly #cache: DirectoryCache
  #inFlight: Promise<readonly Pizzeria[]> | undefined

  constructor (
    fetchPizzerias: PizzeriaDirectoryReader['getPizzerias'],
    options: PizzeriaDirectoryGatewayOptions = {}
  ) {
    this.#fetchPizzerias = fetchPizzerias
    this.#cache = options.cache ?? new DirectoryCache(options.cacheOptions)
  }

  async getPizzerias (): Promise<Pizzeria[]> {
    const fresh = this.#cache.getFresh()
    if (fresh !== undefined) {
      return [...fresh]
    }

    if (this.#inFlight !== undefined) {
      return [...await this.#inFlight]
    }

    const request = this.#loadDirectory()
    this.#inFlight = request

    try {
      return [...await request]
    } finally {
      this.#inFlight = undefined
    }
  }

  async #loadDirectory (): Promise<readonly Pizzeria[]> {
    try {
      const pizzerias = await this.#fetchPizzerias()
      this.#cache.set(pizzerias)
      return pizzerias
    } catch (error) {
      const stale = this.#cache.getStale()
      if (stale !== undefined) {
        return stale
      }
      throw error
    }
  }
}
