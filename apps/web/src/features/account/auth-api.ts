import type { PublicUser } from '@pizzawise/shared'

export type AccountErrorCode =
  | 'conflict'
  | 'unauthorized'
  | 'invalid'
  | 'invalid-response'
  | 'request-failed'

export class AccountRequestError extends Error {
  readonly code: AccountErrorCode

  constructor (code: AccountErrorCode, message: string) {
    super(message)
    this.name = 'AccountRequestError'
    this.code = code
  }
}

type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type GetCurrentUser = () => Promise<PublicUser | null>
export type RegisterUser = (email: string, password: string) => Promise<PublicUser>
export type LoginUser = (email: string, password: string) => Promise<PublicUser>
export type LogoutUser = () => Promise<void>

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
} as const

export async function getCurrentUser (
  fetch: HttpFetch = globalThis.fetch
): Promise<PublicUser | null> {
  const response = await request('/api/auth/me', { method: 'GET' }, fetch)

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new AccountRequestError(
      'request-failed',
      await readErrorMessage(response, 'Could not restore the current session.')
    )
  }

  return await readPublicUser(response)
}

export async function registerUser (
  email: string,
  password: string,
  fetch: HttpFetch = globalThis.fetch
): Promise<PublicUser> {
  return await submitAuth('/api/auth/register', email, password, fetch)
}

export async function loginUser (
  email: string,
  password: string,
  fetch: HttpFetch = globalThis.fetch
): Promise<PublicUser> {
  return await submitAuth('/api/auth/login', email, password, fetch)
}

export async function logoutUser (
  fetch: HttpFetch = globalThis.fetch
): Promise<void> {
  const response = await request('/api/auth/logout', { method: 'POST' }, fetch)

  if (!response.ok) {
    throw new AccountRequestError(
      'request-failed',
      await readErrorMessage(response, 'Could not log out.')
    )
  }
}

async function submitAuth (
  url: string,
  email: string,
  password: string,
  fetch: HttpFetch
): Promise<PublicUser> {
  const response = await request(
    url,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password })
    },
    fetch
  )

  if (response.status === 409) {
    throw new AccountRequestError(
      'conflict',
      await readErrorMessage(response, 'Email already exists')
    )
  }

  if (response.status === 401) {
    throw new AccountRequestError(
      'unauthorized',
      await readErrorMessage(response, 'Invalid email or password')
    )
  }

  if (response.status === 400) {
    throw new AccountRequestError(
      'invalid',
      await readErrorMessage(response, 'Account details are invalid.')
    )
  }

  if (!response.ok) {
    throw new AccountRequestError(
      'request-failed',
      await readErrorMessage(response, 'Account request failed.')
    )
  }

  return await readPublicUser(response)
}

async function request (
  url: string,
  init: RequestInit,
  fetch: HttpFetch
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...init.headers
      }
    })
  } catch {
    throw new AccountRequestError(
      'request-failed',
      'Account service could not be reached.'
    )
  }
}

async function readPublicUser (response: Response): Promise<PublicUser> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new AccountRequestError(
      'invalid-response',
      'Account returned invalid JSON.'
    )
  }

  if (!isPublicUser(payload)) {
    throw new AccountRequestError(
      'invalid-response',
      'Account returned an invalid response.'
    )
  }

  return payload
}

export async function readErrorMessage (
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string' &&
      payload.message.length > 0
    ) {
      return payload.message
    }
  } catch {
    return fallback
  }

  return fallback
}

function isPublicUser (value: unknown): value is PublicUser {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.email === 'string' &&
    record.email.length > 0 &&
    typeof record.createdAt === 'string' &&
    record.createdAt.length > 0 &&
    !('passwordHash' in record)
  )
}
