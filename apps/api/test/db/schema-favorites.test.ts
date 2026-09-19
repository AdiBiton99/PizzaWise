import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import {
  favoritePizzaToppings,
  favoritePizzas,
  users
} from '../../src/db/schema.js'

test('favorite_pizzas.user_id references users.id with cascade', () => {
  const config = getTableConfig(favoritePizzas)
  assert.equal(config.foreignKeys.length, 1)

  const [foreignKey] = config.foreignKeys
  const reference = foreignKey.reference()
  assert.equal(reference.foreignTable, users)
  assert.deepEqual(
    reference.columns.map((column) => column.name),
    ['user_id']
  )
  assert.equal(foreignKey.onDelete, 'cascade')
  assert.equal(
    config.indexes.some((entry) => entry.config.name === 'favorite_pizzas_user_id_idx'),
    true
  )
})

test('favorite_pizza_toppings uses a composite primary key and cascades', () => {
  const config = getTableConfig(favoritePizzaToppings)
  assert.deepEqual(
    config.primaryKeys[0]?.columns.map((column) => column.name),
    ['favorite_pizza_id', 'topping_tag']
  )
  assert.equal(config.foreignKeys.length, 1)
  assert.equal(config.foreignKeys[0].onDelete, 'cascade')
  assert.equal(
    config.foreignKeys[0].reference().foreignTable,
    favoritePizzas
  )
})
