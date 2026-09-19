import type {
  ComparisonPriority,
  PizzaConfiguration,
  UserLocation
} from '@pizzawise/shared'
import {
  assertPizzaConfigurationShape,
  parsePizzaConfiguration,
  PizzaConfigurationError
} from '../pizza-configuration.js'

export const COMPARISON_PRIORITIES = new Set<ComparisonPriority>([
  'price',
  'distance',
  'eta'
])

const REQUIRED_KEYS = new Set(['location', 'configuration'])
const OPTIONAL_KEYS = new Set(['priority', 'radiusKm'])
const LOCATION_KEYS = new Set(['latitude', 'longitude'])

export class CompareRequestError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'CompareRequestError'
  }
}

export interface ParsedCompareRequest {
  readonly location: UserLocation
  readonly radiusKm?: number
  readonly configuration: PizzaConfiguration
  readonly priority?: ComparisonPriority
}

export function assertCompareBodyShape (
  body: unknown
): asserts body is {
  location: unknown
  radiusKm?: unknown
  configuration: unknown
  priority?: unknown
} {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new CompareRequestError('Comparison body is invalid')
  }

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  const allowed = new Set([...REQUIRED_KEYS, ...OPTIONAL_KEYS])

  if (
    keys.some((key) => !allowed.has(key)) ||
    [...REQUIRED_KEYS].some((key) => !keys.includes(key))
  ) {
    throw new CompareRequestError('Comparison body is invalid')
  }

  if ('priority' in record && !isComparisonPriority(record.priority)) {
    throw new CompareRequestError('Comparison priority is invalid')
  }

  assertLocationShape(record.location)

  if (
    'radiusKm' in record &&
    (typeof record.radiusKm !== 'number' ||
      !Number.isFinite(record.radiusKm) ||
      record.radiusKm < 0)
  ) {
    throw new CompareRequestError('Comparison radius is invalid')
  }

  try {
    assertPizzaConfigurationShape(record.configuration)
  } catch (error) {
    if (error instanceof PizzaConfigurationError) {
      throw new CompareRequestError(error.message)
    }
    throw error
  }
}

export function parseCompareRequest (body: {
  location: { latitude: number, longitude: number }
  radiusKm?: number
  configuration: {
    sizeTag: string
    crustTag: string
    sauceTag: string
    toppingTags: readonly string[]
  }
  priority?: ComparisonPriority
}): ParsedCompareRequest {
  try {
    const parsed: ParsedCompareRequest = {
      location: {
        latitude: body.location.latitude,
        longitude: body.location.longitude
      },
      configuration: parsePizzaConfiguration(body.configuration),
      ...(body.radiusKm === undefined ? {} : { radiusKm: body.radiusKm })
    }

    if (body.priority !== undefined) {
      return {
        ...parsed,
        priority: body.priority
      }
    }

    return parsed
  } catch (error) {
    if (error instanceof PizzaConfigurationError) {
      throw new CompareRequestError(error.message)
    }
    throw error
  }
}

function assertLocationShape (
  value: unknown
): asserts value is { latitude: number, longitude: number } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new CompareRequestError('Comparison location is invalid')
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record)

  if (
    keys.length !== LOCATION_KEYS.size ||
    keys.some((key) => !LOCATION_KEYS.has(key)) ||
    typeof record.latitude !== 'number' ||
    !Number.isFinite(record.latitude) ||
    record.latitude < -90 ||
    record.latitude > 90 ||
    typeof record.longitude !== 'number' ||
    !Number.isFinite(record.longitude) ||
    record.longitude < -180 ||
    record.longitude > 180
  ) {
    throw new CompareRequestError('Comparison location is invalid')
  }
}

function isComparisonPriority (value: unknown): value is ComparisonPriority {
  return value === 'price' || value === 'distance' || value === 'eta'
}
