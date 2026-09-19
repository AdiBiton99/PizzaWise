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
import { build } from '../helper.js'

const password = 'password1'

const pizzaBody = {
  name: 'Weeknight',
  sizeTag: 'medium',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['onion', 'mushroom']
}

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

test('GET /api/favorites requires authentication', async (t) => {
  const app = await build(t)
  const response = await app.inject({
    method: 'GET',
    url: '/api/favorites'
  })
  assert.equal(response.statusCode, 401)
})

test('registration does not create favorites', async (t) => {
  const app = await build(t)
  const { cookies } = await register(app, 'user@example.com')
  const response = await app.inject({
    method: 'GET',
    url: '/api/favorites',
    cookies
  })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { favorites: [] })
})

test('POST creates a favorite and GET returns it sorted by name then id', async (t) => {
  const app = await build(t)
  const { cookies } = await register(app, 'user@example.com')

  const zed = await app.inject({
    method: 'POST',
    url: '/api/favorites',
    cookies,
    payload: { ...pizzaBody, name: 'Zed' }
  })
  const ada = await app.inject({
    method: 'POST',
    url: '/api/favorites',
    cookies,
    payload: { ...pizzaBody, name: 'Ada', toppingTags: [] }
  })

  assert.equal(zed.statusCode, 201)
  assert.equal(ada.statusCode, 201)
  assert.deepEqual(zed.json().configuration.toppingTags, ['mushroom', 'onion'])
  assert.deepEqual(ada.json().configuration.toppingTags, [])

  const listed = await app.inject({
    method: 'GET',
    url: '/api/favorites',
    cookies
  })
  assert.equal(listed.statusCode, 200)
  assert.deepEqual(
    listed.json().favorites.map((favorite: { name: string }) => favorite.name),
    ['Ada', 'Zed']
  )
})

test('PUT replaces a favorite and DELETE removes it', async (t) => {
  const app = await build(t)
  const { cookies } = await register(app, 'user@example.com')
  const created = await app.inject({
    method: 'POST',
    url: '/api/favorites',
    cookies,
    payload: pizzaBody
  })
  const id = created.json().id as string

  const updated = await app.inject({
    method: 'PUT',
    url: `/api/favorites/${id}`,
    cookies,
    payload: {
      name: 'Sunday',
      sizeTag: 'large',
      crustTag: 'pan',
      sauceTag: 'pesto',
      toppingTags: ['pepperoni']
    }
  })
  assert.equal(updated.statusCode, 200)
  assert.equal(updated.json().name, 'Sunday')
  assert.equal(updated.json().configuration.sizeTag, 'large')
  assert.deepEqual(updated.json().configuration.toppingTags, ['pepperoni'])

  const deleted = await app.inject({
    method: 'DELETE',
    url: `/api/favorites/${id}`,
    cookies
  })
  assert.equal(deleted.statusCode, 204)

  const listed = await app.inject({
    method: 'GET',
    url: '/api/favorites',
    cookies
  })
  assert.deepEqual(listed.json(), { favorites: [] })

  const missing = await app.inject({
    method: 'DELETE',
    url: `/api/favorites/${id}`,
    cookies
  })
  assert.equal(missing.statusCode, 404)
})

test('rejects invalid bodies, unknown tags, and invalid ids', async (t) => {
  const app = await build(t)
  const { cookies } = await register(app, 'user@example.com')

  const extra = await app.inject({
    method: 'POST',
    url: '/api/favorites',
    cookies,
    payload: { ...pizzaBody, pizzeriaId: 'x' }
  })
  assert.equal(extra.statusCode, 400)

  const unknownTag = await app.inject({
    method: 'POST',
    url: '/api/favorites',
    cookies,
    payload: { ...pizzaBody, sizeTag: 'Large' }
  })
  assert.equal(unknownTag.statusCode, 400)

  const duplicateToppings = await app.inject({
    method: 'POST',
    url: '/api/favorites',
    cookies,
    payload: { ...pizzaBody, toppingTags: ['mushroom', 'mushroom'] }
  })
  assert.equal(duplicateToppings.statusCode, 400)

  const invalidId = await app.inject({
    method: 'DELETE',
    url: '/api/favorites/not-a-uuid',
    cookies
  })
  assert.equal(invalidId.statusCode, 400)
})

test('a user cannot read or change another user favorite', async (t) => {
  const app = await build(t)
  const userA = await register(app, 'a@example.com')
  const userB = await register(app, 'b@example.com')

  const created = await app.inject({
    method: 'POST',
    url: '/api/favorites',
    cookies: userA.cookies,
    payload: pizzaBody
  })
  const id = created.json().id as string

  const bGet = await app.inject({
    method: 'GET',
    url: '/api/favorites',
    cookies: userB.cookies
  })
  assert.deepEqual(bGet.json(), { favorites: [] })

  const bPut = await app.inject({
    method: 'PUT',
    url: `/api/favorites/${id}`,
    cookies: userB.cookies,
    payload: { ...pizzaBody, name: 'Stolen' }
  })
  assert.equal(bPut.statusCode, 404)

  const bDelete = await app.inject({
    method: 'DELETE',
    url: `/api/favorites/${id}`,
    cookies: userB.cookies
  })
  assert.equal(bDelete.statusCode, 404)

  const aGet = await app.inject({
    method: 'GET',
    url: '/api/favorites',
    cookies: userA.cookies
  })
  assert.equal(aGet.json().favorites.length, 1)
  assert.equal(aGet.json().favorites[0].name, 'Weeknight')
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
    url: '/api/favorites',
    cookies: { [SESSION_COOKIE_NAME]: token }
  })

  assert.equal(response.statusCode, 401)
  assert.equal(sessionStore.size, 0)
})
