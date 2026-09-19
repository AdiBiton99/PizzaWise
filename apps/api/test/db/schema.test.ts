import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { sessions, users } from '../../src/db/schema.js'

test('users.email is unique', () => {
  assert.equal(users.email.isUnique, true)
  assert.equal(users.email.uniqueName, 'users_email_unique')
})

test('sessions.token_hash is unique and user_id references users.id', () => {
  assert.equal(sessions.tokenHash.isUnique, true)
  assert.equal(sessions.tokenHash.uniqueName, 'sessions_token_hash_unique')

  const config = getTableConfig(sessions)
  assert.equal(config.foreignKeys.length, 1)

  const [foreignKey] = config.foreignKeys
  const reference = foreignKey.reference()
  assert.equal(reference.foreignTable, users)
  assert.deepEqual(
    reference.columns.map((column) => column.name),
    ['user_id']
  )
  assert.deepEqual(
    reference.foreignColumns.map((column) => column.name),
    ['id']
  )
  assert.equal(foreignKey.onDelete, 'cascade')
})
