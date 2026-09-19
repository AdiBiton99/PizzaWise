import type { UserProfile } from '@pizzawise/shared'
import {
  AccountRequestError,
  readErrorMessage
} from './auth-api'

type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type GetProfile = () => Promise<UserProfile | null>
export type SaveProfile = (
  displayName: string,
  phone: string
) => Promise<UserProfile>

export async function getProfile (
  fetch: HttpFetch = globalThis.fetch
): Promise<UserProfile | null> {
  const response = await request('/api/profile', { method: 'GET' }, fetch)

  if (response.status === 401) {
    throw new AccountRequestError(
      'unauthorized',
      await readErrorMessage(response, 'Authentication required')
    )
  }

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new AccountRequestError(
      'request-failed',
      await readErrorMessage(response, 'Could not load the profile.')
    )
  }

  return await readUserProfile(response)
}

export async function saveProfile (
  displayName: string,
  phone: string,
  fetch: HttpFetch = globalThis.fetch
): Promise<UserProfile> {
  const response = await request(
    '/api/profile',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ displayName, phone })
    },
    fetch
  )

  if (response.status === 401) {
    throw new AccountRequestError(
      'unauthorized',
      await readErrorMessage(response, 'Authentication required')
    )
  }

  if (response.status === 400) {
    throw new AccountRequestError(
      'invalid',
      await readErrorMessage(response, 'Profile details are invalid.')
    )
  }

  if (!response.ok) {
    throw new AccountRequestError(
      'request-failed',
      await readErrorMessage(response, 'Could not save the profile.')
    )
  }

  return await readUserProfile(response)
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

async function readUserProfile (response: Response): Promise<UserProfile> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new AccountRequestError(
      'invalid-response',
      'Profile returned invalid JSON.'
    )
  }

  if (!isUserProfile(payload)) {
    throw new AccountRequestError(
      'invalid-response',
      'Profile returned an invalid response.'
    )
  }

  return payload
}

function isUserProfile (value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.userId === 'string' &&
    record.userId.length > 0 &&
    typeof record.displayName === 'string' &&
    typeof record.phone === 'string'
  )
}
