import { eq } from 'drizzle-orm'
import type { Database } from '../db/index.js'
import { profiles } from '../db/schema.js'
import type { ProfileRecord, ProfileStore } from './profile-store.js'

export class MysqlProfileStore implements ProfileStore {
  readonly #db: Database

  constructor (db: Database) {
    this.#db = db
  }

  async findByUserId (userId: string): Promise<ProfileRecord | null> {
    const rows = await this.#db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1)

    return rows[0] === undefined ? null : toProfileRecord(rows[0])
  }

  async upsert (profile: ProfileRecord): Promise<void> {
    await this.#db
      .insert(profiles)
      .values({
        userId: profile.userId,
        displayName: profile.displayName,
        phone: profile.phone,
        defaultDeliveryAddress: profile.defaultDeliveryAddress
      })
      .onDuplicateKeyUpdate({
        set: {
          displayName: profile.displayName,
          phone: profile.phone,
          defaultDeliveryAddress: profile.defaultDeliveryAddress
        }
      })
  }
}

function toProfileRecord (row: typeof profiles.$inferSelect): ProfileRecord {
  return {
    userId: row.userId,
    displayName: row.displayName,
    phone: row.phone,
    defaultDeliveryAddress: row.defaultDeliveryAddress
  }
}
