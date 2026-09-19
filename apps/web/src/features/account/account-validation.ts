export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128
export const MIN_DISPLAY_NAME_LENGTH = 1
export const MAX_DISPLAY_NAME_LENGTH = 80
export const MIN_PHONE_DIGITS = 8
export const MAX_PHONE_DIGITS = 15

export function validateEmail (email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_FORMAT.test(normalized)) {
    return 'Email is invalid'
  }

  return null
}

export function validatePassword (password: string): string | null {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`
  }

  return null
}

export function validateDisplayName (displayName: string): string | null {
  const normalized = displayName.trim()
  if (
    normalized.length < MIN_DISPLAY_NAME_LENGTH ||
    normalized.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    return `Display name must be between ${MIN_DISPLAY_NAME_LENGTH} and ${MAX_DISPLAY_NAME_LENGTH} characters`
  }

  return null
}

export function validatePhone (phone: string): string | null {
  const normalized = phone.trim().replaceAll(/[\s-]+/g, '')
  if (!/^\+?[0-9]+$/.test(normalized)) {
    return 'Phone is invalid'
  }

  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return 'Phone is invalid'
  }

  return null
}

export function normalizeEmailInput (email: string): string {
  return email.trim().toLowerCase()
}
