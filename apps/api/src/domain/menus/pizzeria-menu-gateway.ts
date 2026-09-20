import type { Menu } from '@pizzawise/shared'
import {
  isRetryablePizzeriaError,
  PizzeriaApiClientError
} from '../../integrations/pizzeria-api/index.js'
import {
  defaultUpstreamSleep,
  UPSTREAM_RETRY_ATTEMPTS,
  upstreamDelayMs,
  type UpstreamLogWarn,
  type UpstreamSleep
} from '../../integrations/upstream-retry.js'
import { MenuCache, type MenuCacheOptions } from './menu-cache.js'
import { UpstreamScheduler, type UpstreamSchedulerOptions } from './upstream-scheduler.js'
import type { MenuReader } from './fetch-nearby-menus.js'

export interface PizzeriaMenuGatewayOptions {
  readonly cache?: MenuCache
  readonly cacheOptions?: MenuCacheOptions
  readonly scheduler?: UpstreamScheduler
  readonly schedulerOptions?: UpstreamSchedulerOptions
  readonly sleep?: UpstreamSleep
  readonly warn?: UpstreamLogWarn
}

export class PizzeriaMenuGateway implements MenuReader {
  readonly #fetchMenu: MenuReader['getMenu']
  readonly #cache: MenuCache
  readonly #scheduler: UpstreamScheduler
  readonly #sleep: UpstreamSleep
  readonly #warn: UpstreamLogWarn | undefined
  readonly #inFlight = new Map<string, Promise<Menu>>()

  constructor (
    fetchMenu: MenuReader['getMenu'],
    options: PizzeriaMenuGatewayOptions = {}
  ) {
    this.#fetchMenu = fetchMenu
    this.#cache = options.cache ?? new MenuCache(options.cacheOptions)
    this.#scheduler =
      options.scheduler ?? new UpstreamScheduler(options.schedulerOptions)
    this.#sleep = options.sleep ?? defaultUpstreamSleep
    this.#warn = options.warn
  }

  async getMenu (pizzeriaId: string): Promise<Menu> {
    const fresh = this.#cache.getFresh(pizzeriaId)
    if (fresh !== undefined) {
      return fresh
    }

    const pending = this.#inFlight.get(pizzeriaId)
    if (pending !== undefined) {
      return await pending
    }

    const request = this.#loadMenu(pizzeriaId)
    this.#inFlight.set(pizzeriaId, request)

    try {
      return await request
    } finally {
      this.#inFlight.delete(pizzeriaId)
    }
  }

  async #loadMenu (pizzeriaId: string): Promise<Menu> {
    try {
      const menu = await this.#fetchWithRetries(pizzeriaId)
      this.#cache.set(pizzeriaId, menu)
      return menu
    } catch (error) {
      const stale = this.#cache.getStale(pizzeriaId)
      if (stale !== undefined) {
        return stale
      }
      throw error
    }
  }

  async #fetchWithRetries (pizzeriaId: string): Promise<Menu> {
    let lastError: unknown

    for (let attempt = 1; attempt <= UPSTREAM_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await this.#scheduler.schedule(
          async () => await this.#fetchMenu(pizzeriaId)
        )
      } catch (error) {
        lastError = error
        const willRetry =
          attempt < UPSTREAM_RETRY_ATTEMPTS && isRetryablePizzeriaError(error)
        this.#warn?.(
          {
            operation: 'getMenu',
            pizzeriaId,
            attempt,
            willRetry,
            errorName: error instanceof Error ? error.name : 'UnknownError',
            ...(error instanceof PizzeriaApiClientError
              ? {
                  kind: error.kind,
                  ...(error.status === undefined ? {} : { status: error.status })
                }
              : {})
          },
          willRetry
            ? 'Retrying pizzeria API request'
            : 'Pizzeria API request failed'
        )

        if (error instanceof PizzeriaApiClientError && error.status === 429) {
          this.#scheduler.noteRateLimit(error.retryAfterSeconds)
        }

        if (!willRetry) {
          throw error
        }

        await this.#sleep(upstreamDelayMs(
          error instanceof PizzeriaApiClientError
            ? error.retryAfterSeconds
            : undefined,
          attempt - 1
        ))
      }
    }

    throw lastError
  }
}
