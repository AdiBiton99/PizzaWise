import type { Menu, Pizzeria } from '@pizzawise/shared'

export const DEFAULT_MENU_CACHE_WARM_INTERVAL_MS = 4 * 60_000
export const DEFAULT_MENU_CACHE_WARM_RETRY_MIN_MS = 5_000
export const DEFAULT_MENU_CACHE_WARM_RETRY_MAX_MS = 60_000

export interface MenuWarmClient {
  getPizzerias(): Promise<readonly Pizzeria[]>
  getMenu(pizzeriaId: string): Promise<Menu>
}

export type MenuWarmLog = (
  fields: Record<string, unknown>,
  message: string
) => void

type IntervalHandle = ReturnType<typeof setInterval>
type TimeoutHandle = ReturnType<typeof setTimeout>

export interface MenuCacheWarmerOptions {
  readonly intervalMs?: number
  readonly retryMinMs?: number
  readonly retryMaxMs?: number
  readonly info?: MenuWarmLog
  readonly warn?: MenuWarmLog
}

export class MenuCacheWarmer {
  readonly #client: MenuWarmClient
  readonly #intervalMs: number
  readonly #retryMinMs: number
  readonly #retryMaxMs: number
  readonly #info: MenuWarmLog | undefined
  readonly #warn: MenuWarmLog | undefined
  #running = false
  #started = false
  #stopped = false
  #refreshReady = false
  #retryAttempt = 0
  #timer: IntervalHandle | undefined
  #retryTimer: TimeoutHandle | undefined

  constructor (client: MenuWarmClient, options: MenuCacheWarmerOptions = {}) {
    this.#client = client
    this.#intervalMs = options.intervalMs ?? DEFAULT_MENU_CACHE_WARM_INTERVAL_MS
    this.#retryMinMs = options.retryMinMs ?? DEFAULT_MENU_CACHE_WARM_RETRY_MIN_MS
    this.#retryMaxMs = options.retryMaxMs ?? DEFAULT_MENU_CACHE_WARM_RETRY_MAX_MS
    this.#info = options.info
    this.#warn = options.warn

    if (!Number.isSafeInteger(this.#intervalMs) || this.#intervalMs <= 0) {
      throw new RangeError(
        'Menu cache warm interval must be a positive safe integer'
      )
    }
    if (!Number.isSafeInteger(this.#retryMinMs) || this.#retryMinMs <= 0) {
      throw new RangeError(
        'Menu cache warm retry minimum must be a positive safe integer'
      )
    }
    if (!Number.isSafeInteger(this.#retryMaxMs) || this.#retryMaxMs <= 0) {
      throw new RangeError(
        'Menu cache warm retry maximum must be a positive safe integer'
      )
    }
    if (this.#retryMaxMs < this.#retryMinMs) {
      throw new RangeError(
        'Menu cache warm retry maximum must be at least the retry minimum'
      )
    }
  }

  start (): void {
    if (this.#started || this.#stopped) {
      return
    }

    this.#started = true
    void this.runOnce()
  }

  stop (): void {
    this.#stopped = true
    this.#clearRetryTimer()
    if (this.#timer !== undefined) {
      clearInterval(this.#timer)
      this.#timer = undefined
    }
  }

  async runOnce (): Promise<void> {
    if (this.#running || this.#stopped) {
      return
    }

    this.#running = true
    const startedAt = Date.now()
    this.#info?.(
      { event: 'menu-cache-warm' },
      'Background menu cache warm started'
    )

    let directoryFailed = false
    let directoryError: unknown
    try {
      const pizzerias = await this.#client.getPizzerias()
      const results = await Promise.all(
        pizzerias.map(async (pizzeria) => {
          try {
            await this.#client.getMenu(pizzeria.id)
            return true
          } catch {
            return false
          }
        })
      )
      const cachedMenuCount = results.filter(Boolean).length
      const failedMenuCount = results.length - cachedMenuCount
      this.#info?.(
        {
          event: 'menu-cache-warm',
          cachedMenuCount,
          failedMenuCount,
          pizzeriaCount: pizzerias.length,
          durationMs: Date.now() - startedAt
        },
        'Background menu cache warm completed'
      )
      this.#onWarmSucceeded()
    } catch (error) {
      directoryFailed = true
      directoryError = error
    } finally {
      this.#running = false
      if (directoryFailed) {
        this.#onWarmFailed(directoryError)
      }
    }
  }

  #onWarmSucceeded (): void {
    this.#retryAttempt = 0
    this.#clearRetryTimer()
    this.#refreshReady = true
    this.#ensureRefreshInterval()
  }

  #onWarmFailed (error: unknown): void {
    const retryDelayMs = Math.min(
      this.#retryMinMs * 2 ** this.#retryAttempt,
      this.#retryMaxMs
    )
    this.#retryAttempt += 1
    const fields: Record<string, unknown> = {
      event: 'menu-cache-warm',
      errorName: error instanceof Error ? error.name : 'UnknownError'
    }
    if (this.#started && !this.#stopped) {
      fields.retryDelayMs = retryDelayMs
    }
    this.#warn?.(fields, 'Background menu cache warm failed')
    this.#scheduleRetry(retryDelayMs)
  }

  #ensureRefreshInterval (): void {
    if (
      this.#stopped ||
      !this.#started ||
      !this.#refreshReady ||
      this.#timer !== undefined
    ) {
      return
    }

    this.#timer = setInterval(() => {
      void this.runOnce()
    }, this.#intervalMs)
  }

  #scheduleRetry (retryDelayMs: number): void {
    if (this.#stopped || !this.#started || this.#retryTimer !== undefined) {
      return
    }

    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = undefined
      void this.runOnce()
    }, retryDelayMs)
  }

  #clearRetryTimer (): void {
    if (this.#retryTimer !== undefined) {
      clearTimeout(this.#retryTimer)
      this.#retryTimer = undefined
    }
  }
}
