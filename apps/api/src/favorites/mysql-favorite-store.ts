import { and, eq, inArray } from 'drizzle-orm'
import type { PizzaConfiguration } from '@pizzawise/shared'
import type { Database } from '../db/index.js'
import { favoritePizzaToppings, favoritePizzas } from '../db/schema.js'
import {
  compareFavoritesByNameThenId,
  sortedToppingTags,
  type FavoriteRecord,
  type FavoriteStore
} from './favorite-store.js'

export class MysqlFavoriteStore implements FavoriteStore {
  readonly #db: Database

  constructor (db: Database) {
    this.#db = db
  }

  async listByUserId (userId: string): Promise<readonly FavoriteRecord[]> {
    const pizzaRows = await this.#db
      .select()
      .from(favoritePizzas)
      .where(eq(favoritePizzas.userId, userId))

    if (pizzaRows.length === 0) {
      return []
    }

    const toppingRows = await this.#db
      .select()
      .from(favoritePizzaToppings)
      .where(
        inArray(
          favoritePizzaToppings.favoritePizzaId,
          pizzaRows.map((row) => row.id)
        )
      )

    const toppingsByFavoriteId = new Map<string, string[]>()
    for (const row of toppingRows) {
      const tags = toppingsByFavoriteId.get(row.favoritePizzaId) ?? []
      tags.push(row.toppingTag)
      toppingsByFavoriteId.set(row.favoritePizzaId, tags)
    }

    return pizzaRows
      .map((row) => toFavoriteRecord(
        row,
        toppingsByFavoriteId.get(row.id) ?? []
      ))
      .sort(compareFavoritesByNameThenId)
  }

  async create (favorite: FavoriteRecord): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await tx.insert(favoritePizzas).values(toPizzaRow(favorite))
      await insertToppings(tx, favorite.id, favorite.configuration.toppingTags)
    })
  }

  async update (userId: string, favorite: FavoriteRecord): Promise<boolean> {
    return await this.#db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: favoritePizzas.id })
        .from(favoritePizzas)
        .where(
          and(
            eq(favoritePizzas.id, favorite.id),
            eq(favoritePizzas.userId, userId)
          )
        )
        .limit(1)

      if (existing[0] === undefined) {
        return false
      }

      await tx
        .update(favoritePizzas)
        .set({
          name: favorite.name,
          sizeTag: favorite.configuration.sizeTag,
          crustTag: favorite.configuration.crustTag,
          sauceTag: favorite.configuration.sauceTag
        })
        .where(eq(favoritePizzas.id, favorite.id))

      await tx
        .delete(favoritePizzaToppings)
        .where(eq(favoritePizzaToppings.favoritePizzaId, favorite.id))

      await insertToppings(tx, favorite.id, favorite.configuration.toppingTags)
      return true
    })
  }

  async delete (userId: string, id: string): Promise<boolean> {
    return await this.#db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: favoritePizzas.id })
        .from(favoritePizzas)
        .where(
          and(eq(favoritePizzas.id, id), eq(favoritePizzas.userId, userId))
        )
        .limit(1)

      if (existing[0] === undefined) {
        return false
      }

      await tx.delete(favoritePizzas).where(eq(favoritePizzas.id, id))
      return true
    })
  }
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

async function insertToppings (
  tx: Transaction,
  favoritePizzaId: string,
  toppingTags: PizzaConfiguration['toppingTags']
): Promise<void> {
  if (toppingTags.length === 0) {
    return
  }

  await tx.insert(favoritePizzaToppings).values(
    toppingTags.map((toppingTag) => ({
      favoritePizzaId,
      toppingTag
    }))
  )
}

function toPizzaRow (favorite: FavoriteRecord) {
  return {
    id: favorite.id,
    userId: favorite.userId,
    name: favorite.name,
    sizeTag: favorite.configuration.sizeTag,
    crustTag: favorite.configuration.crustTag,
    sauceTag: favorite.configuration.sauceTag
  }
}

function toFavoriteRecord (
  row: typeof favoritePizzas.$inferSelect,
  toppingTags: readonly string[]
): FavoriteRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    configuration: {
      sizeTag: row.sizeTag,
      crustTag: row.crustTag,
      sauceTag: row.sauceTag,
      toppingTags: sortedToppingTags(toppingTags)
    }
  }
}
