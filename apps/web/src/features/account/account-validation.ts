export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128
export const MIN_PHONE_DIGITS = 8
export const MAX_PHONE_DIGITS = 15

export function validateEmail (email: string): 'validation.emailInvalid' | null {
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_FORMAT.test(normalized)) {
    return 'validation.emailInvalid'
  }

  return null
}

export function validatePassword (
  password: string
): 'validation.passwordLength' | null {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return 'validation.passwordLength'
  }

  return null
}

export function validatePhone (phone: string): 'validation.phoneInvalid' | null {
  const normalized = phone.trim().replaceAll(/[\s-]+/g, '')
  if (!/^\+?[0-9]+$/.test(normalized)) {
    return 'validation.phoneInvalid'
  }

  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return 'validation.phoneInvalid'
  }

  return null
}

export function normalizeEmailInput (email: string): string {
  return email.trim().toLowerCase()
}
