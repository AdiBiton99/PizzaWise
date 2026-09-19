import {
  PhoneValidationError,
  MAX_PHONE_DIGITS,
  MIN_PHONE_DIGITS,
  normalizePhone as normalizeContactPhone
} from '../domain/phone.js'

export const MIN_DISPLAY_NAME_LENGTH = 1
export const MAX_DISPLAY_NAME_LENGTH = 80
export { MAX_PHONE_DIGITS, MIN_PHONE_DIGITS }

export class ProfileValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ProfileValidationError'
  }
}

export function assertProfileBodyShape (
  body: unknown
): asserts body is { displayName: string, phone: string } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ProfileValidationError('Profile body is invalid')
  }

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (
    keys.length !== 2 ||
    typeof record.displayName !== 'string' ||
    typeof record.phone !== 'string'
  ) {
    throw new ProfileValidationError('Profile body is invalid')
  }
}

export function normalizeDisplayName (displayName: string): string {
  const normalized = displayName.trim()
  if (
    normalized.length < MIN_DISPLAY_NAME_LENGTH ||
    normalized.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    throw new ProfileValidationError(
      `Display name must be between ${MIN_DISPLAY_NAME_LENGTH} and ${MAX_DISPLAY_NAME_LENGTH} characters`
    )
  }

  return normalized
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
