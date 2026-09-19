import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { profiles, users } from '../../src/db/schema.js'

test('profiles.user_id is the primary key and cascades from users.id', () => {
  assert.equal(profiles.userId.primary, true)
  assert.equal(profiles.displayName.isUnique, false)
  assert.equal(profiles.phone.isUnique, false)

  const config = getTableConfig(profiles)
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
