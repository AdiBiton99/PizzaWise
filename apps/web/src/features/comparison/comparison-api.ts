import type {
  ComparisonPriority,
  PizzaComparison,
  PizzaConfiguration,
  RankedPizza,
  UserLocation
} from '@pizzawise/shared'

export type ComparisonErrorCode =
  | 'invalid-response'
  | 'request-failed'

export class ComparisonRequestError extends Error {
  readonly code: ComparisonErrorCode

  constructor (code: ComparisonErrorCode, message: string) {
    super(message)
    this.name = 'ComparisonRequestError'
    this.code = code
  }
}

export interface ComparePizzasRequest {
  readonly location: UserLocation
  readonly radiusKm?: number
  readonly configuration: PizzaConfiguration
  readonly priority?: ComparisonPriority
}

export type ComparePizzas = (
  request: ComparePizzasRequest
) => Promise<PizzaComparison>

type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export async function comparePizzas (
  request: ComparePizzasRequest,
  fetch: HttpFetch = globalThis.fetch
): Promise<PizzaComparison> {
  const body: Record<string, unknown> = {
    location: request.location,
    configuration: request.configuration
  }

  if (request.radiusKm !== undefined) {
    body.radiusKm = request.radiusKm
  }

  if (request.priority !== undefined) {
    body.priority = request.priority
  }

  let response: Response

  try {
    response = await fetch('/api/pizzerias/compare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    })
  } catch {
    throw new ComparisonRequestError(
      'request-failed',
      'Comparison could not be reached.'
    )
  }

  if (!response.ok) {
    throw new ComparisonRequestError(
      'request-failed',
      'Comparison failed.'
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ComparisonRequestError(
      'invalid-response',
      'Comparison returned invalid JSON.'
    )
  }

  if (!isPizzaComparison(payload)) {
    throw new ComparisonRequestError(
      'invalid-response',
      'Comparison returned an invalid response.'
    )
  }

  return payload
}

function isPizzaComparison (value: unknown): value is PizzaComparison {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('ranked' in value) ||
    !Array.isArray(value.ranked) ||
    !('uncheckedPizzeriaCount' in value) ||
    typeof value.uncheckedPizzeriaCount !== 'number' ||
    !Number.isInteger(value.uncheckedPizzeriaCount) ||
    value.uncheckedPizzeriaCount < 0
  ) {
    return false
  }

  return value.ranked.every(isRankedPizza)
}

function isRankedPizza (value: unknown): value is RankedPizza {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    typeof record.rank !== 'number' ||
    typeof record.nearby !== 'object' ||
    record.nearby === null ||
    typeof record.total !== 'object' ||
    record.total === null
  ) {
    return false
  }

  const nearby = record.nearby as Record<string, unknown>
  const pizzeria = nearby.pizzeria
  const total = record.total as Record<string, unknown>

  return (
    typeof nearby.distanceKm === 'number' &&
    Number.isFinite(nearby.distanceKm) &&
    typeof pizzeria === 'object' &&
    pizzeria !== null &&
    typeof (pizzeria as { name?: unknown }).name === 'string' &&
    typeof total.amountMinor === 'number' &&
    Number.isFinite(total.amountMinor) &&
    typeof total.currency === 'string'
  )
}
