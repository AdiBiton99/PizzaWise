import { describe, expect, it, vi } from 'vitest'
import {
  AccountRequestError,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser
} from './auth-api'

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  createdAt: '2026-09-17T20:00:00.000Z'
}

describe('auth API', () => {
  it('registers with credentials included and returns the public user', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/auth/register')
      expect(init?.method).toBe('POST')
      expect(init?.credentials).toBe('include')
      expect(JSON.parse(String(init?.body))).toEqual({
        email: 'user@example.com',
        password: 'password1'
      })
      return jsonResponse(USER)
    })

    await expect(
      registerUser('user@example.com', 'password1', fetch)
    ).resolves.toEqual(USER)
  })

  it('logs in and maps 401 to an unauthorized error', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ message: 'Invalid email or password' }, 401)
    )

    await expect(
      loginUser('user@example.com', 'wrong-password', fetch)
    ).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'Invalid email or password'
    })
  })

  it('maps a duplicate email to conflict', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ message: 'Email already exists' }, 409)
    )

    await expect(
      registerUser('user@example.com', 'password1', fetch)
    ).rejects.toMatchObject({
      code: 'conflict',
      message: 'Email already exists'
    })
  })

  it('restores the current user and treats 401 as signed out', async () => {
    const okFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/auth/me')
      expect(init?.method).toBe('GET')
      expect(init?.credentials).toBe('include')
      return jsonResponse(USER)
    })

    await expect(getCurrentUser(okFetch)).resolves.toEqual(USER)

    const signedOutFetch = vi.fn(async () => new Response('', { status: 401 }))
    await expect(getCurrentUser(signedOutFetch)).resolves.toBeNull()
  })

  it('logs out with an empty 204 response', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/auth/logout')
      expect(init?.method).toBe('POST')
      expect(init?.credentials).toBe('include')
      return new Response(null, { status: 204 })
    })

    await expect(logoutUser(fetch)).resolves.toBeUndefined()
  })

  it('rejects a public user that includes a password hash', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ ...USER, passwordHash: 'secret' })
    )

    await expect(getCurrentUser(fetch)).rejects.toBeInstanceOf(AccountRequestError)
  })
})

function jsonResponse (body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
