import {
  defaultUpstreamSleep,
  UPSTREAM_RETRY_AFTER_CAP_MS,
  type UpstreamSleep
} from '../../integrations/upstream-retry.js'

export const DEFAULT_UPSTREAM_SCHEDULER_CONCURRENCY = 2
export const DEFAULT_UPSTREAM_MIN_INTERVAL_MS = 50
export const DEFAULT_UPSTREAM_RATE_LIMIT_COOLDOWN_MS = 1_000

export type SchedulerClock = () => number

interface ScheduledJob<T> {
  readonly run: () => Promise<T>
  readonly resolve: (value: T) => void
  readonly reject: (error: unknown) => void
}

export interface UpstreamSchedulerOptions {
  readonly concurrency?: number
  readonly minIntervalMs?: number
  readonly defaultCooldownMs?: number
  readonly sleep?: UpstreamSleep
  readonly now?: SchedulerClock
}

export class UpstreamScheduler {
  readonly #concurrency: number
  readonly #minIntervalMs: number
  readonly #defaultCooldownMs: number
  readonly #sleep: UpstreamSleep
  readonly #now: SchedulerClock
  readonly #queue: Array<ScheduledJob<unknown>> = []
  #inFlight = 0
  #pumping = false
  #cooldownUntil = 0
  #nextStartAt = 0

  constructor (options: UpstreamSchedulerOptions = {}) {
    this.#concurrency =
      options.concurrency ?? DEFAULT_UPSTREAM_SCHEDULER_CONCURRENCY
    this.#minIntervalMs = options.minIntervalMs ?? DEFAULT_UPSTREAM_MIN_INTERVAL_MS
    this.#defaultCooldownMs =
      options.defaultCooldownMs ?? DEFAULT_UPSTREAM_RATE_LIMIT_COOLDOWN_MS
    this.#sleep = options.sleep ?? defaultUpstreamSleep
    this.#now = options.now ?? Date.now

    if (!Number.isSafeInteger(this.#concurrency) || this.#concurrency <= 0) {
      throw new RangeError('Scheduler concurrency must be a positive safe integer')
    }

    if (!Number.isSafeInteger(this.#minIntervalMs) || this.#minIntervalMs < 0) {
      throw new RangeError('Scheduler min interval must be a non-negative safe integer')
    }
  }

  get inFlight (): number {
    return this.#inFlight
  }

  schedule<T> (run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.#queue.push({
        run,
        resolve: resolve as (value: unknown) => void,
        reject
      })
      void this.#pump()
    })
  }

  noteRateLimit (retryAfterSeconds?: number): void {
    const waitMs =
      retryAfterSeconds === undefined
        ? this.#defaultCooldownMs
        : Math.min(retryAfterSeconds * 1_000, UPSTREAM_RETRY_AFTER_CAP_MS)
    this.#cooldownUntil = Math.max(this.#cooldownUntil, this.#now() + waitMs)
  }

  async #pump (): Promise<void> {
    if (this.#pumping) {
      return
    }

    this.#pumping = true

    try {
      while (
        this.#queue.length > 0 &&
        this.#inFlight < this.#concurrency
      ) {
        const waitUntil = Math.max(this.#cooldownUntil, this.#nextStartAt)
        const waitMs = waitUntil - this.#now()
        if (waitMs > 0) {
          await this.#sleep(waitMs)
          if (this.#now() < waitUntil) {
            this.#nextStartAt = Math.min(this.#nextStartAt, this.#now())
            this.#cooldownUntil = Math.min(this.#cooldownUntil, this.#now())
          }
          continue
        }

        const job = this.#queue.shift()
        if (job === undefined) {
          break
        }

        this.#inFlight += 1
        this.#nextStartAt = this.#now() + this.#minIntervalMs
        void this.#execute(job)
      }
    } finally {
      this.#pumping = false
      if (this.#queue.length > 0 && this.#inFlight < this.#concurrency) {
        void this.#pump()
      }
    }
  }

  async #execute (job: ScheduledJob<unknown>): Promise<void> {
    try {
      job.resolve(await job.run())
    } catch (error) {
      job.reject(error)
    } finally {
      this.#inFlight -= 1
      void this.#pump()
    }
  }
}
