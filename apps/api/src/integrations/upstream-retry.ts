export const UPSTREAM_RETRY_ATTEMPTS = 3
export const UPSTREAM_RETRY_AFTER_CAP_MS = 2_000
export const UPSTREAM_BACKOFF_BASE_MS = 200
export const UPSTREAM_BACKOFF_CAP_MS = 1_000

export type UpstreamLogWarn = (
  fields: Record<string, unknown>,
  message: string
) => void

export type UpstreamSleep = (ms: number) => Promise<void>

export async function defaultUpstreamSleep (ms: number): Promise<void> {
  if (ms <= 0) {
    return
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function withUpstreamRetries<T> (options: {
  readonly operation: () => Promise<T>
  readonly isRetryable: (error: unknown) => boolean
  readonly delayMs: (error: unknown, failedAttemptIndex: number) => number
  readonly onFailure?: (
    error: unknown,
    failedAttempt: number,
    willRetry: boolean
  ) => void
  readonly sleep?: UpstreamSleep
}): Promise<T> {
  const sleep = options.sleep ?? defaultUpstreamSleep
  let lastError: unknown

  for (let attempt = 1; attempt <= UPSTREAM_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await options.operation()
    } catch (error) {
      lastError = error
      const willRetry =
        attempt < UPSTREAM_RETRY_ATTEMPTS && options.isRetryable(error)
      options.onFailure?.(error, attempt, willRetry)
      if (!willRetry) {
        throw error
      }

      await sleep(options.delayMs(error, attempt - 1))
    }
  }

  throw lastError
}

export function upstreamDelayMs (
  retryAfterSeconds: number | undefined,
  failedAttemptIndex: number,
  random: () => number = Math.random
): number {
  if (retryAfterSeconds !== undefined) {
    return Math.min(retryAfterSeconds * 1_000, UPSTREAM_RETRY_AFTER_CAP_MS)
  }

  const exponential = Math.min(
    UPSTREAM_BACKOFF_BASE_MS * 2 ** failedAttemptIndex,
    UPSTREAM_BACKOFF_CAP_MS
  )
  const sample = random()
  const unit = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 1) : 0
  return Math.floor(unit * (exponential + 1))
}

export function parseRetryAfterSeconds (value: string | null): number | undefined {
  if (value === null) {
    return undefined
  }

  if (/^\d+$/.test(value)) {
    const seconds = Number(value)
    return Number.isSafeInteger(seconds) ? seconds : undefined
  }

  const retryAt = Date.parse(value)
  if (!Number.isFinite(retryAt)) {
    return undefined
  }

  const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1_000))
  return Number.isSafeInteger(seconds) ? seconds : undefined
}
