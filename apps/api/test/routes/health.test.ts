import assert from 'node:assert/strict'
import { test } from 'node:test'
import { REQUEST_ID_HEADER } from '../../src/observability.js'
import { build } from '../helper.js'

test('health route reports that the API is running', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    status: 'ok'
  })
})

test('health route returns 503 when the database ping fails', async (t) => {
  const app = await build(t, {
    pingDatabase: async () => {
      throw new Error('mysql://user:secret@localhost/pizzawise')
    }
  })

  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })

  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.json(), {
    status: 'unhealthy'
  })
  assert.doesNotMatch(response.body, /secret|mysql:\/\//)
})

test('echoes an incoming request id on the response', async (t) => {
  const app = await build(t)
  const requestId = '11111111-1111-4111-8111-111111111111'

  const response = await app.inject({
    method: 'GET',
    url: '/health',
    headers: {
      [REQUEST_ID_HEADER]: requestId
    }
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.headers[REQUEST_ID_HEADER], requestId)
})

test('assigns a request id when the client does not send one', async (t) => {
  const app = await build(t)

  const response = await app.inject({
    method: 'GET',
    url: '/health'
  })

  assert.equal(response.statusCode, 200)
  assert.match(
    String(response.headers[REQUEST_ID_HEADER]),
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  )
})
