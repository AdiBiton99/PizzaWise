import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getTableConfig } from 'drizzle-orm/mysql-core'
import { orders, orderToppings, users } from '../../src/db/schema.js'

test('orders.user_id references users.id with cascade', () => {
  const config = getTableConfig(orders)
  assert.equal(config.foreignKeys.length, 1)
  assert.equal(config.foreignKeys[0].onDelete, 'cascade')
  assert.equal(config.foreignKeys[0].reference().foreignTable, users)
  assert.equal(
    config.indexes.some((entry) => entry.config.name === 'orders_user_id_idx'),
    true
  )
})

test('order_toppings uses a composite primary key and cascades', () => {
  const config = getTableConfig(orderToppings)
  assert.deepEqual(
    config.primaryKeys[0]?.columns.map((column) => column.name),
    ['order_id', 'topping_tag']
  )
  assert.equal(config.foreignKeys.length, 1)
  assert.equal(config.foreignKeys[0].onDelete, 'cascade')
  assert.equal(config.foreignKeys[0].reference().foreignTable, orders)
})
