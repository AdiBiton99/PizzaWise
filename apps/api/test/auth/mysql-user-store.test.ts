import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MysqlUserStore } from '../../src/auth/mysql-user-store.js'
import { DuplicateEmailError } from '../../src/auth/user-store.js'
import type { Database } from '../../src/db/index.js'

function dbThatRejectsInsert (error: unknown): Database {
  return {
    insert () {
      return {
        values: async () => {
          throw error
        }
      }
    }
  } as unknown as Database
}

test('maps MySQL errno 1062 to DuplicateEmailError', async () => {
  const error = Object.assign(new Error('Duplicate entry'), { errno: 1062 })
  const store = new MysqlUserStore(dbThatRejectsInsert(error))

  await assert.rejects(
    store.create({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      passwordHash: 'hash',
      createdAt: new Date()
    }),
    DuplicateEmailError
  )
})

test('maps ER_DUP_ENTRY on a wrapped cause to DuplicateEmailError', async () => {
  const cause = Object.assign(new Error('Duplicate entry'), {
    code: 'ER_DUP_ENTRY'
  })
  const error = new Error('insert failed', { cause })
  const store = new MysqlUserStore(dbThatRejectsInsert(error))

  await assert.rejects(
    store.create({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      passwordHash: 'hash',
      createdAt: new Date()
    }),
    DuplicateEmailError
  )
})
