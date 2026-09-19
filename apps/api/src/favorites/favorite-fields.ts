import type { PizzaConfiguration } from '@pizzawise/shared'
import {
  parsePizzaConfiguration,
  PizzaConfigurationError
} from '../domain/pizza-configuration.js'

export const MIN_FAVORITE_NAME_LENGTH = 1
export const MAX_FAVORITE_NAME_LENGTH = 80

const FAVORITE_BODY_KEYS = new Set([
  'name',
  'sizeTag',
  'crustTag',
  'sauceTag',
  'toppingTags'
])

export class FavoriteValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'FavoriteValidationError'
  }
}

export interface FavoriteInput {
  readonly name: string
  readonly configuration: PizzaConfiguration
}

export function assertFavoriteBodyShape (
  body: unknown
): asserts body is {
  name: string
  sizeTag: string
  crustTag: string
  sauceTag: string
  toppingTags: string[]
} {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new FavoriteValidationError('Favorite body is invalid')
  }

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (
    keys.length !== FAVORITE_BODY_KEYS.size ||
    keys.some((key) => !FAVORITE_BODY_KEYS.has(key)) ||
    typeof record.name !== 'string' ||
    typeof record.sizeTag !== 'string' ||
    typeof record.crustTag !== 'string' ||
    typeof record.sauceTag !== 'string' ||
    !Array.isArray(record.toppingTags) ||
    record.toppingTags.some((tag) => typeof tag !== 'string')
  ) {
    throw new FavoriteValidationError('Favorite body is invalid')
  }
}

export function parseFavoriteInput (body: {
  name: string
  sizeTag: string
  crustTag: string
  sauceTag: string
  toppingTags: readonly string[]
}): FavoriteInput {
  try {
    return {
      name: normalizeFavoriteName(body.name),
      configuration: parsePizzaConfiguration(body)
    }
  } catch (error) {
    if (error instanceof PizzaConfigurationError) {
      throw new FavoriteValidationError(error.message)
    }
    throw error
  }
}

function normalizeFavoriteName (name: string): string {
  const normalized = name.trim()
  if (
    normalized.length < MIN_FAVORITE_NAME_LENGTH ||
    normalized.length > MAX_FAVORITE_NAME_LENGTH
  ) {
    throw new FavoriteValidationError(
      `Favorite name must be between ${MIN_FAVORITE_NAME_LENGTH} and ${MAX_FAVORITE_NAME_LENGTH} characters`
    )
  }

  return normalized
}
