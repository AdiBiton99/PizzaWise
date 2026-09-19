export const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class EmailValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'EmailValidationError'
  }
}

export function normalizeEmail (email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_FORMAT.test(normalized)) {
    throw new EmailValidationError('Email is invalid')
  }

  return normalized
}
