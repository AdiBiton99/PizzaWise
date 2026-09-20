import { describe, expect, it, vi } from 'vitest'
import { getProfile, saveProfile } from './profile-api'

const PROFILE = {
  userId: '11111111-1111-4111-8111-111111111111',
  phone: '0501234567',
  defaultDeliveryAddress: '10 Herzl St'
}

describe('profile API', () => {
  it('returns null when no profile exists yet', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/profile')
      expect(init?.method).toBe('GET')
      expect(init?.credentials).toBe('include')
      return jsonResponse({ message: 'Profile not found' }, 404)
    })

    await expect(getProfile(fetch)).resolves.toBeNull()
  })

  it('saves a profile with credentials included', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/profile')
      expect(init?.method).toBe('PUT')
      expect(init?.credentials).toBe('include')
      expect(JSON.parse(String(init?.body))).toEqual({
        phone: '050 123-4567',
        defaultDeliveryAddress: '  10 Herzl St  '
      })
      return jsonResponse(PROFILE)
    })

    await expect(
      saveProfile('050 123-4567', '  10 Herzl St  ', fetch)
    ).resolves.toEqual(PROFILE)
  })

  it('maps validation failures to invalid profile errors', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ message: 'Phone is invalid' }, 400)
    )

    await expect(saveProfile('nope', null, fetch)).rejects.toMatchObject({
      code: 'invalid',
      message: 'Phone is invalid'
    })
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
