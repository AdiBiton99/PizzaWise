import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { MemorySessionStore } from '../../src/auth/memory-session-store.js'
import { MemoryUserStore } from '../../src/auth/memory-user-store.js'
import { hashPassword } from '../../src/auth/password.js'
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieOptions
} from '../../src/auth/session-cookie.js'
import {
  generateSessionToken,
  hashSessionToken
} from '../../src/auth/session-token.js'
import { build } from '../helper.js'

const password = 'password1'
const email = 'user@example.com'

test('registers a user, sets a session cookie, and returns the public user', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email: '  User@Example.COM  ',
      password
    }
  })

  assert.equal(response.statusCode, 200)
  const body = response.json()
  assert.equal(body.email, email)
  assert.equal(typeof body.id, 'string')
  assert.equal(typeof body.createdAt, 'string')
  assert.equal('passwordHash' in body, false)

  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE_NAME)
  assert.ok(cookie)
  assert.equal(cookie.httpOnly, true)
  assert.equal(cookie.path, '/')
  assert.equal(String(cookie.sameSite).toLowerCase(), 'lax')
  assert.equal(Number(cookie.maxAge), SESSION_TTL_SECONDS)
  assert.notEqual(cookie.secure, true)
})

test('maps a duplicate email to 409 Conflict', async (t) => {
  const app = await build(t)
  const payload = { email, password }

  const first = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload
  })
  assert.equal(first.statusCode, 200)

  const second = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload
  })
  assert.equal(second.statusCode, 409)
  assert.equal(second.json().message, 'Email already exists')
})

test('login returns the same 401 for unknown email and wrong password', async (t) => {
  const app = await build(t)

  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password }
  })

  const unknown = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'missing@example.com', password }
  })
  const wrongPassword = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'wrong-password' }
  })

  assert.equal(unknown.statusCode, 401)
  assert.equal(wrongPassword.statusCode, 401)
  assert.deepEqual(unknown.json(), wrongPassword.json())
  assert.equal(unknown.json().message, 'Invalid email or password')
})

test('login sets a session cookie and returns the public user', async (t) => {
  const app = await build(t)

  const register = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password }
  })
  assert.equal(register.statusCode, 200)

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: '  User@Example.COM  ',
      password
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.json().email, email)
  assert.equal(response.json().id, register.json().id)
  assert.equal('passwordHash' in response.json(), false)

  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE_NAME)
  assert.ok(cookie)
  assert.equal(cookie.httpOnly, true)
  assert.equal(String(cookie.sameSite).toLowerCase(), 'lax')
  assert.notEqual(cookie.secure, true)
})

test('login returns the same 401 for a malformed email', async (t) => {
  const app = await build(t)

  const unknown = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'missing@example.com', password }
  })
  const malformed = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'not-an-email', password }
  })

  assert.equal(malformed.statusCode, 401)
  assert.deepEqual(malformed.json(), unknown.json())
  assert.equal(malformed.json().message, 'Invalid email or password')
})

test('GET /me returns the authenticated user', async (t) => {
  const app = await build(t)
  const register = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password }
  })
  const cookie = register.cookies.find((item) => item.name === SESSION_COOKIE_NAME)
  assert.ok(cookie)

  const me = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    cookies: { [SESSION_COOKIE_NAME]: cookie.value }
  })

  assert.equal(me.statusCode, 200)
  assert.equal(me.json().email, email)
  assert.equal(me.json().id, register.json().id)
})

test('rejects an expired session and deletes it from the store', async (t) => {
  const userStore = new MemoryUserStore()
  const sessionStore = new MemorySessionStore()
  const userId = randomUUID()
  await userStore.create({
    id: userId,
    email,
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
    url: '/api/auth/me',
    cookies: { [SESSION_COOKIE_NAME]: token }
  })

  assert.equal(response.statusCode, 401)
  assert.equal(sessionStore.size, 0)
})

test('GET /me requires a session cookie', async (t) => {
  const app = await build(t)
  const response = await app.inject({
    method: 'GET',
    url: '/api/auth/me'
  })

  assert.equal(response.statusCode, 401)
  assert.equal(response.json().message, 'Authentication required')
})

test('rejects a session whose user no longer exists and deletes it', async (t) => {
  const userStore = new MemoryUserStore()
  const sessionStore = new MemorySessionStore()
  const token = generateSessionToken()
  await sessionStore.create({
    id: randomUUID(),
    userId: randomUUID(),
    tokenHash: hashSessionToken(token),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000)
  })

  const app = await build(t, { userStore, sessionStore })
  const response = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    cookies: { [SESSION_COOKIE_NAME]: token }
  })

  assert.equal(response.statusCode, 401)
  assert.equal(sessionStore.size, 0)
})

test('session cookies are Secure only in production', () => {
  const previous = process.env.NODE_ENV

  try {
    process.env.NODE_ENV = 'production'
    assert.equal(sessionCookieOptions().secure, true)

    process.env.NODE_ENV = 'development'
    assert.equal(sessionCookieOptions().secure, false)
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previous
    }
  }
})

test('logout deletes the session and clears the cookie', async (t) => {
  const sessionStore = new MemorySessionStore()
  const app = await build(t, { sessionStore })
  const register = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password }
  })
  const cookie = register.cookies.find((item) => item.name === SESSION_COOKIE_NAME)
  assert.ok(cookie)
  assert.equal(sessionStore.size, 1)

  const logout = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    cookies: { [SESSION_COOKIE_NAME]: cookie.value }
  })

  assert.equal(logout.statusCode, 204)
  assert.equal(sessionStore.size, 0)

  const cleared = logout.cookies.find((item) => item.name === SESSION_COOKIE_NAME)
  assert.ok(cleared)
  assert.equal(cleared.value, '')
})
