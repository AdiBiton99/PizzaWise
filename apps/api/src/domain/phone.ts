export const MIN_PHONE_DIGITS = 8
export const MAX_PHONE_DIGITS = 15

export class PhoneValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'PhoneValidationError'
  }
}

export function normalizePhone (phone: string): string {
  const normalized = phone.trim().replaceAll(/[\s-]+/g, '')
  if (!/^\+?[0-9]+$/.test(normalized)) {
    throw new PhoneValidationError('Phone is invalid')
  }

  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    throw new PhoneValidationError('Phone is invalid')
  }

  return normalized
}
