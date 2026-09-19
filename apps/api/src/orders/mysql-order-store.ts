import { and, eq, inArray } from 'drizzle-orm'
import type {
  FulfillmentType,
  OrderStatus,
  PizzaConfiguration
} from '@pizzawise/shared'
import type { Database } from '../db/index.js'
import { orderToppings, orders } from '../db/schema.js'
import {
  compareOrdersNewestFirst,
  sortedToppingTags,
  type OrderRecord,
  type OrderStore
} from './order-store.js'

export class MysqlOrderStore implements OrderStore {
  readonly #db: Database

  constructor (db: Database) {
    this.#db = db
  }

  async create (order: OrderRecord): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: order.id,
        userId: order.userId,
        pizzeriaId: order.pizzeriaId,
        pizzeriaName: order.pizzeriaName,
        sizeTag: order.configuration.sizeTag,
        crustTag: order.configuration.crustTag,
        sauceTag: order.configuration.sauceTag,
        amountMinor: order.total.amountMinor,
        currency: order.total.currency,
        phone: order.phone,
        fulfillmentType: order.fulfillmentType,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        createdAt: order.createdAt
      })
      await insertToppings(tx, order.id, order.configuration.toppingTags)
    })
  }

  async listByUserId (userId: string): Promise<readonly OrderRecord[]> {
    const orderRows = await this.#db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))

    if (orderRows.length === 0) {
      return []
    }

    const toppingsByOrderId = await loadToppingsByOrderId(
      this.#db,
      orderRows.map((row) => row.id)
    )

    return orderRows
      .map((row) => toOrderRecord(row, toppingsByOrderId.get(row.id) ?? []))
      .sort(compareOrdersNewestFirst)
  }

  async findByUserIdAndId (
    userId: string,
    id: string
  ): Promise<OrderRecord | null> {
    const orderRows = await this.#db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1)

    const row = orderRows[0]
    if (row === undefined) {
      return null
    }

    const toppingsByOrderId = await loadToppingsByOrderId(this.#db, [row.id])
    return toOrderRecord(row, toppingsByOrderId.get(row.id) ?? [])
  }
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

async function insertToppings (
  tx: Transaction,
  orderId: string,
  toppingTags: PizzaConfiguration['toppingTags']
): Promise<void> {
  if (toppingTags.length === 0) {
    return
  }

  await tx.insert(orderToppings).values(
    toppingTags.map((toppingTag) => ({
      orderId,
      toppingTag
    }))
  )
}

async function loadToppingsByOrderId (
  db: Database,
  orderIds: readonly string[]
): Promise<Map<string, string[]>> {
  const toppingRows = await db
    .select()
    .from(orderToppings)
    .where(inArray(orderToppings.orderId, [...orderIds]))

  const toppingsByOrderId = new Map<string, string[]>()
  for (const row of toppingRows) {
    const tags = toppingsByOrderId.get(row.orderId) ?? []
    tags.push(row.toppingTag)
    toppingsByOrderId.set(row.orderId, tags)
  }

  return toppingsByOrderId
}

function toOrderRecord (
  row: typeof orders.$inferSelect,
  toppingTags: readonly string[]
): OrderRecord {
  return {
    id: row.id,
    userId: row.userId,
    pizzeriaId: row.pizzeriaId,
    pizzeriaName: row.pizzeriaName,
    configuration: {
      sizeTag: row.sizeTag,
      crustTag: row.crustTag,
      sauceTag: row.sauceTag,
      toppingTags: sortedToppingTags(toppingTags)
    },
    total: {
      amountMinor: row.amountMinor,
      currency: row.currency
    },
    phone: row.phone,
    fulfillmentType: row.fulfillmentType as FulfillmentType,
    deliveryAddress: row.deliveryAddress,
    status: row.status as OrderStatus,
    createdAt: row.createdAt
  }
}
