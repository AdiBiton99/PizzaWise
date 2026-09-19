import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Database } from '../../src/db/index.js'
import { build } from '../helper.js'

test('injects the database handle onto Fastify and closes cleanly', async (t) => {
  const db = { marker: 'injected-db' } as unknown as Database
  const app = await build(t, { db })

  assert.equal(app.db, db)
  await app.close()
})
