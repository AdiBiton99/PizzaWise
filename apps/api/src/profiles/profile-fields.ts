import {
  PhoneValidationError,
  MAX_PHONE_DIGITS,
  MIN_PHONE_DIGITS,
  normalizePhone as normalizeContactPhone
} from '../domain/phone.js'

export const DEFAULT_PROFILE_DISPLAY_NAME = 'User'
export const MAX_DEFAULT_DELIVERY_ADDRESS_LENGTH = 200
export { MAX_PHONE_DIGITS, MIN_PHONE_DIGITS }

export class ProfileValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ProfileValidationError'
  }
}

export interface ProfileBody {
  readonly phone: string
  readonly defaultDeliveryAddress: string | null
}

export function assertProfileBodyShape (
  body: unknown
): asserts body is ProfileBody {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ProfileValidationError('Profile body is invalid')
  }

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (
    keys.length !== 2 ||
    typeof record.phone !== 'string' ||
    !isOptionalAddress(record.defaultDeliveryAddress)
  ) {
    throw new ProfileValidationError('Profile body is invalid')
  }
}

export function normalizePhone (phone: string): string {
  try {
    return normalizeContactPhone(phone)
  } catch (error) {
    if (error instanceof PhoneValidationError) {
      throw new ProfileValidationError(error.message)
    }
    throw error
  }
}

export function normalizeDefaultDeliveryAddress (
  address: string | null
): string | null {
  if (address === null) {
    return null
  }

  const normalized = address.trim()
  if (normalized.length === 0) {
    return null
  }

  if (normalized.length > MAX_DEFAULT_DELIVERY_ADDRESS_LENGTH) {
    throw new ProfileValidationError(
      `Delivery address must not exceed ${MAX_DEFAULT_DELIVERY_ADDRESS_LENGTH} characters`
    )
  }

  return normalized
}

function isOptionalAddress (value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}
