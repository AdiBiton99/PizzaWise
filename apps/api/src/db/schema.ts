import { char, datetime, index, int, mysqlTable, primaryKey, varchar } from 'drizzle-orm/mysql-core'
import { binaryUuid } from './uuid.js'

export const users = mysqlTable('users', {
  id: binaryUuid('id').primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull()
})

export const sessions = mysqlTable('sessions', {
  id: binaryUuid('id').primaryKey(),
  userId: binaryUuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
  expiresAt: datetime('expires_at', { mode: 'date', fsp: 3 }).notNull()
})

export const profiles = mysqlTable('profiles', {
  userId: binaryUuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 80 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull()
})

export const favoritePizzas = mysqlTable(
  'favorite_pizzas',
  {
    id: binaryUuid('id').primaryKey(),
    userId: binaryUuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    sizeTag: varchar('size_tag', { length: 64 }).notNull(),
    crustTag: varchar('crust_tag', { length: 64 }).notNull(),
    sauceTag: varchar('sauce_tag', { length: 64 }).notNull()
  },
  (table) => [
    index('favorite_pizzas_user_id_idx').on(table.userId)
  ]
)

export const favoritePizzaToppings = mysqlTable(
  'favorite_pizza_toppings',
  {
    favoritePizzaId: binaryUuid('favorite_pizza_id')
      .notNull()
      .references(() => favoritePizzas.id, { onDelete: 'cascade' }),
    toppingTag: varchar('topping_tag', { length: 64 }).notNull()
  },
  (table) => [
    primaryKey({
      columns: [table.favoritePizzaId, table.toppingTag]
    })
  ]
)

export const orders = mysqlTable(
  'orders',
  {
    id: binaryUuid('id').primaryKey(),
    userId: binaryUuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pizzeriaId: varchar('pizzeria_id', { length: 128 }).notNull(),
    pizzeriaName: varchar('pizzeria_name', { length: 255 }).notNull(),
    sizeTag: varchar('size_tag', { length: 64 }).notNull(),
    crustTag: varchar('crust_tag', { length: 64 }).notNull(),
    sauceTag: varchar('sauce_tag', { length: 64 }).notNull(),
    amountMinor: int('amount_minor').notNull(),
    currency: varchar('currency', { length: 16 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    fulfillmentType: varchar('fulfillment_type', { length: 32 }).notNull(),
    deliveryAddress: varchar('delivery_address', { length: 200 }),
    status: varchar('status', { length: 32 }).notNull(),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull()
  },
  (table) => [
    index('orders_user_id_idx').on(table.userId)
  ]
)

export const orderToppings = mysqlTable(
  'order_toppings',
  {
    orderId: binaryUuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    toppingTag: varchar('topping_tag', { length: 64 }).notNull()
  },
  (table) => [
    primaryKey({
      columns: [table.orderId, table.toppingTag]
    })
  ]
)

export const schema = {
  users,
  sessions,
  profiles,
  favoritePizzas,
  favoritePizzaToppings,
  orders,
  orderToppings
}
