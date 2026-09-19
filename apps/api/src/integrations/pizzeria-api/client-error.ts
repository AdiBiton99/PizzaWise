export class PizzeriaApiClientError extends Error {
  readonly status: number | undefined
  readonly kind: PizzeriaApiFailureKind
  readonly retryAfterSeconds: number | undefined

  constructor (
    message: string,
    options: {
      cause?: unknown
      status?: number
      kind?: PizzeriaApiFailureKind
      retryAfterSeconds?: number
    } = {}
  ) {
    super(message, { cause: options.cause })
    this.name = 'PizzeriaApiClientError'
    this.status = options.status
    this.kind = options.kind ?? 'network'
    this.retryAfterSeconds = options.retryAfterSeconds
  }
}

export type PizzeriaApiFailureKind =
  | 'http'
  | 'timeout'
  | 'network'
  | 'invalid-json'
  | 'config'
  | 'aborted'
