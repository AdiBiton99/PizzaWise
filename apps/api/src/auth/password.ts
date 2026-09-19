import argon2 from 'argon2'

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

export class PasswordValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'PasswordValidationError'
  }
}

export function assertValidPassword (password: string): void {
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new PasswordValidationError(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`
    )
  }
}

export async function hashPassword (password: string): Promise<string> {
  assertValidPassword(password)
  return await argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword (
  hash: string,
  password: string
): Promise<boolean> {
  return await argon2.verify(hash, password)
}
