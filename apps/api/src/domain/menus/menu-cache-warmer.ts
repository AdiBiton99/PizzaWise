import type { Menu, Pizzeria } from '@pizzawise/shared'

export const DEFAULT_MENU_CACHE_WARM_INTERVAL_MS = 4 * 60_000

export interface MenuWarmClient {
  getPizzerias(): Promise<readonly Pizzeria[]>
  getMenu(pizzeriaId: string): Promise<Menu>
}

export type MenuWarmWarn = (
  fields: Record<string, unknown>,
  message: string
) => void

type IntervalHandle = ReturnType<typeof setInterval>

export interface MenuCacheWarmerOptions {
  readonly intervalMs?: number
  readonly warn?: MenuWarmWarn
}

export class MenuCacheWarmer {
  readonly #client: MenuWarmClient
  readonly #intervalMs: number
  readonly #warn: MenuWarmWarn | undefined
  #running = false
  #started = false
  #stopped = false
  #timer: IntervalHandle | undefined

  constructor (client: MenuWarmClient, options: MenuCacheWarmerOptions = {}) {
    this.#client = client
    this.#intervalMs = options.intervalMs ?? DEFAULT_MENU_CACHE_WARM_INTERVAL_MS
    this.#warn = options.warn

    if (!Number.isSafeInteger(this.#intervalMs) || this.#intervalMs <= 0) {
      throw new RangeError(
        'Menu cache warm interval must be a positive safe integer'
      )
    }
  }

  start (): void {
    if (this.#started || this.#stopped) {
      return
    }

    this.#started = true
    void this.runOnce()
    this.#timer = setInterval(() => {
      void this.runOnce()
    }, this.#intervalMs)
  }

  stop (): void {
    this.#stopped = true
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
      const failedMenuCount = results.filter((ok) => !ok).length
      if (failedMenuCount > 0) {
        this.#warn?.(
          {
            event: 'menu-cache-warm',
            failedMenuCount,
            pizzeriaCount: pizzerias.length
          },
          'Background menu cache warm completed with menu failures'
        )
      }
    } catch (error) {
      this.#warn?.(
        {
          event: 'menu-cache-warm',
          errorName: error instanceof Error ? error.name : 'UnknownError'
        },
        'Background menu cache warm failed'
      )
    } finally {
      this.#running = false
    }
  }
}
