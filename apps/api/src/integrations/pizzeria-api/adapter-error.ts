import type { ZodError } from 'zod'

export class PizzeriaApiAdapterError extends Error {
  constructor (message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PizzeriaApiAdapterError'
  }
}

export function malformedResponseError (
  responseName: string,
  error: ZodError
): PizzeriaApiAdapterError {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'response'
      return `${path}: ${issue.message}`
    })
    .join('; ')

  return new PizzeriaApiAdapterError(
    `Malformed ${responseName} response: ${details}`,
    { cause: error }
  )
}
