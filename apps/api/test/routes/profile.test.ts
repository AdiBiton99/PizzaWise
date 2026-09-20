import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { MemorySessionStore } from '../../src/auth/memory-session-store.js'
import { MemoryUserStore } from '../../src/auth/memory-user-store.js'
import { hashPassword } from '../../src/auth/password.js'
import { SESSION_COOKIE_NAME } from '../../src/auth/session-cookie.js'
import {
  generateSessionToken,
  hashSessionToken
} from '../../src/auth/session-token.js'
import { MemoryProfileStore } from '../../src/profiles/memory-profile-store.js'
import { build } from '../helper.js'

const password = 'password1'

async function register (
  app: Awaited<ReturnType<typeof build>>,
  email: string
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password }
  })
  assert.equal(response.statusCode, 200)
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE_NAME)
  assert.ok(cookie)
  return {
    userId: response.json().id as string,
    cookies: { [SESSION_COOKIE_NAME]: cookie.value }
  }
}

test('GET /api/profile requires authentication', async (t) => {
  const app = await build(t)
  const response = await app.inject({
    method: 'GET',
    url: '/api/profile'
  })
  assert.equal(response.statusCode, 401)
})

test('registration does not create a profile', async (t) => {
  const app = await build(t)
  const { cookies } = await register(app, 'user@example.com')

  const response = await app.inject({
    method: 'GET',
    url: '/api/profile',
    cookies
  })

  assert.equal(response.statusCode, 404)
  assert.equal(response.json().message, 'Profile not found')
})

test('PUT creates a profile and GET returns it', async (t) => {
  const app = await build(t)
  const { userId, cookies } = await register(app, 'user@example.com')

  const created = await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies,
    payload: {
      phone: '050 123-4567',
      defaultDeliveryAddress: '  10 Herzl St  '
    }
  })

  assert.equal(created.statusCode, 200)
  assert.deepEqual(created.json(), {
    userId,
    phone: '0501234567',
    defaultDeliveryAddress: '10 Herzl St'
  })

  const fetched = await app.inject({
    method: 'GET',
    url: '/api/profile',
    cookies
  })
  assert.equal(fetched.statusCode, 200)
  assert.deepEqual(fetched.json(), created.json())
})

test('PUT updates an existing profile and still returns 200', async (t) => {
  const app = await build(t)
  const { cookies } = await register(app, 'user@example.com')

  await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies,
    payload: { phone: '0501234567', defaultDeliveryAddress: '10 Herzl St' }
  })

  const updated = await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies,
    payload: { phone: '+972501234567', defaultDeliveryAddress: null }
  })

  assert.equal(updated.statusCode, 200)
  assert.equal(updated.json().phone, '+972501234567')
  assert.equal(updated.json().defaultDeliveryAddress, null)
})

test('PUT rejects extra properties and invalid fields', async (t) => {
  const app = await build(t)
  const { cookies } = await register(app, 'user@example.com')

  const extra = await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies,
    payload: {
      phone: '0501234567',
      defaultDeliveryAddress: null,
      userId: randomUUID()
    }
  })
  assert.equal(extra.statusCode, 400)

  const missing = await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies,
    payload: { phone: '0501234567' }
  })
  assert.equal(missing.statusCode, 400)

  const invalid = await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies,
    payload: { phone: '123', defaultDeliveryAddress: null }
  })
  assert.equal(invalid.statusCode, 400)
})

test('a user cannot read or change another user profile', async (t) => {
  const profileStore = new MemoryProfileStore()
  const app = await build(t, { profileStore })
  const userA = await register(app, 'a@example.com')
  const userB = await register(app, 'b@example.com')

  await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies: userA.cookies,
    payload: { phone: '0501234567', defaultDeliveryAddress: '10 Herzl St' }
  })
  await app.inject({
    method: 'PUT',
    url: '/api/profile',
    cookies: userB.cookies,
    payload: { phone: '+972501234567', defaultDeliveryAddress: null }
  })

  const aGet = await app.inject({
    method: 'GET',
    url: '/api/profile',
    cookies: userA.cookies
  })
  const bGet = await app.inject({
    method: 'GET',
    url: '/api/profile',
    cookies: userB.cookies
  })

  assert.equal(aGet.json().userId, userA.userId)
  assert.equal(aGet.json().phone, '0501234567')
  assert.equal(bGet.json().userId, userB.userId)
  assert.equal(bGet.json().phone, '+972501234567')

  const aProfile = await profileStore.findByUserId(userA.userId)
  const bProfile = await profileStore.findByUserId(userB.userId)
  assert.equal(aProfile?.phone, '0501234567')
  assert.equal(bProfile?.phone, '+972501234567')
})

test('rejects an expired session and deletes it from the store', async (t) => {
  const userStore = new MemoryUserStore()
  const sessionStore = new MemorySessionStore()
  const userId = randomUUID()
  await userStore.create({
    id: userId,
    email: 'user@example.com',
    passwordHash: await hashPassword(password),
    createdAt: new Date()
  })

  const token = generateSessionToken()
  await sessionStore.create({
    id: randomUUID(),
    userId,
    tokenHash: hashSessionToken(token),
    createdAt: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() - 1_000)
  })

  const app = await build(t, { userStore, sessionStore })
  const response = await app.inject({
    method: 'GET',
    url: '/api/profile',
    cookies: { [SESSION_COOKIE_NAME]: token }
  })

  assert.equal(response.statusCode, 401)
  assert.equal(sessionStore.size, 0)
})
