import type { Menu, Pizzeria } from '@pizzawise/shared'
import { normalizeMenuSemanticTags } from '../../domain/semantic-normalization/index.js'
import { PizzeriaApiClientError } from './client-error.js'
import {
  loadPizzeriaApiClientConfig,
  type PizzeriaApiClientConfig
} from './client-config.js'
import { normalizeMenuResponse } from './menu-adapter.js'
import { normalizePizzeriasResponse } from './pizzerias-adapter.js'
import {
  defaultUpstreamSleep,
  parseRetryAfterSeconds,
  upstreamDelayMs,
  withUpstreamRetries,
  type UpstreamLogWarn,
  type UpstreamSleep
} from '../upstream-retry.js'

export const DEFAULT_PIZZERIA_API_TIMEOUT_MS = 10_000

export type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export interface PizzeriaApiClientOptions {
  readonly fetch?: HttpFetch
  readonly timeoutMs?: number
  readonly warn?: UpstreamLogWarn
  readonly sleep?: UpstreamSleep
}

export class PizzeriaApiClient {
  readonly #baseUrl: string
  readonly #apiKey: string
  readonly #fetch: HttpFetch
  readonly #timeoutMs: number
  readonly #warn: UpstreamLogWarn | undefined
  readonly #sleep: UpstreamSleep

  constructor (
    config: PizzeriaApiClientConfig,
    options: PizzeriaApiClientOptions = {}
  ) {
    this.#baseUrl = config.baseUrl
    this.#apiKey = config.apiKey
    this.#fetch = options.fetch ?? globalThis.fetch
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_PIZZERIA_API_TIMEOUT_MS
    this.#warn = options.warn
    this.#sleep = options.sleep ?? defaultUpstreamSleep

    if (!Number.isSafeInteger(this.#timeoutMs) || this.#timeoutMs <= 0) {
      throw new PizzeriaApiClientError(
        'Pizzeria API timeout must be a positive safe integer',
        { kind: 'config' }
      )
    }
  }

  async getPizzerias (): Promise<Pizzeria[]> {
    const response = await this.#getJson('pizzerias', {
      operation: 'getPizzerias'
    })
    return normalizePizzeriasResponse(response)
  }

  async getMenu (pizzeriaId: string): Promise<Menu> {
    if (pizzeriaId.length === 0) {
      throw new PizzeriaApiClientError('Pizzeria ID must not be empty', {
        kind: 'config'
      })
    }

    const encodedPizzeriaId = encodeURIComponent(pizzeriaId)
    const response = await this.#getJson(
      `pizzerias/${encodedPizzeriaId}/menu`,
      {
        operation: 'getMenu',
        pizzeriaId
      }
    )
    return normalizeMenuSemanticTags(normalizeMenuResponse(response))
  }

  async #getJson (
    path: string,
    context: {
      readonly operation: 'getPizzerias' | 'getMenu'
      readonly pizzeriaId?: string
    }
  ): Promise<unknown> {
    return await withUpstreamRetries({
      sleep: this.#sleep,
      isRetryable: isRetryablePizzeriaError,
      delayMs: (error, failedAttemptIndex) =>
        upstreamDelayMs(
          error instanceof PizzeriaApiClientError
            ? error.retryAfterSeconds
            : undefined,
          failedAttemptIndex
        ),
      onFailure: (error, attempt, willRetry) => {
        this.#logFailure(context, error, attempt, willRetry)
      },
      operation: async () => await this.#requestJson(path)
    })
  }

  async #requestJson (path: string): Promise<unknown> {
    const url = new URL(path, this.#baseUrl)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs)

    try {
      const response = await this.#fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-API-Key': this.#apiKey
        },
        signal: controller.signal
      })

      if (!response.ok) {
        throw new PizzeriaApiClientError(
          `Pizzeria API request failed with HTTP ${response.status}`,
          {
            status: response.status,
            kind: 'http',
            retryAfterSeconds: parseRetryAfterSeconds(
              response.headers.get('Retry-After')
            )
          }
        )
      }

      try {
        return await response.json()
      } catch (cause) {
        throw new PizzeriaApiClientError(
          'Pizzeria API returned invalid JSON',
          { cause, kind: 'invalid-json' }
        )
      }
    } catch (cause) {
      if (cause instanceof PizzeriaApiClientError) {
        throw cause
      }

      if (controller.signal.aborted) {
        throw new PizzeriaApiClientError(
          `Pizzeria API request timed out after ${this.#timeoutMs}ms`,
          { cause, kind: 'timeout' }
        )
      }

      if (isAbortError(cause)) {
        throw new PizzeriaApiClientError('Pizzeria API request was cancelled', {
          cause,
          kind: 'aborted'
        })
      }

      throw new PizzeriaApiClientError('Pizzeria API request failed', {
        cause,
        kind: 'network'
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  #logFailure (
    context: {
      readonly operation: 'getPizzerias' | 'getMenu'
      readonly pizzeriaId?: string
    },
    error: unknown,
    attempt: number,
    willRetry: boolean
  ): void {
    if (this.#warn === undefined) {
      return
    }

    const fields: Record<string, unknown> = {
      operation: context.operation,
      attempt,
      willRetry,
      errorName:
        error instanceof Error ? error.name : 'UnknownError'
    }

    if (context.pizzeriaId !== undefined) {
      fields.pizzeriaId = context.pizzeriaId
    }

    if (error instanceof PizzeriaApiClientError) {
      fields.kind = error.kind
      if (error.status !== undefined) {
        fields.status = error.status
      }
    }

    this.#warn(
      fields,
      willRetry
        ? 'Retrying pizzeria API request'
        : 'Pizzeria API request failed'
    )
  }
}

export function createPizzeriaApiClientFromEnv (
  environment: NodeJS.ProcessEnv = process.env,
  options: PizzeriaApiClientOptions = {}
): PizzeriaApiClient {
  return new PizzeriaApiClient(
    loadPizzeriaApiClientConfig(environment),
    options
  )
}

export function isRetryablePizzeriaError (error: unknown): boolean {
  if (!(error instanceof PizzeriaApiClientError)) {
    return false
  }

  if (error.kind === 'timeout' || error.kind === 'network') {
    return true
  }

  if (error.kind !== 'http' || error.status === undefined) {
    return false
  }

  return error.status === 429 || error.status >= 500
}

function isAbortError (error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
