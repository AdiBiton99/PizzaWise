import { eq } from 'drizzle-orm'
import type { Database } from '../db/index.js'
import { users } from '../db/schema.js'
import { DuplicateEmailError, type UserRecord, type UserStore } from './user-store.js'

export class MysqlUserStore implements UserStore {
  readonly #db: Database

  constructor (db: Database) {
    this.#db = db
  }

  async create (user: UserRecord): Promise<void> {
    try {
      await this.#db.insert(users).values({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt
      })
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new DuplicateEmailError()
      }

      throw error
    }
  }

  async findByEmail (email: string): Promise<UserRecord | null> {
    const rows = await this.#db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    return rows[0] === undefined ? null : toUserRecord(rows[0])
  }

  async findById (id: string): Promise<UserRecord | null> {
    const rows = await this.#db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return rows[0] === undefined ? null : toUserRecord(rows[0])
  }
}

function toUserRecord (row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt
  }
}

function isDuplicateKeyError (error: unknown): boolean {
  let current: unknown = error

  while (current !== null && typeof current === 'object') {
    if ('errno' in current && current.errno === 1062) {
      return true
    }
    if ('code' in current && current.code === 'ER_DUP_ENTRY') {
      return true
    }

    current = 'cause' in current ? current.cause : undefined
  }

  return false
}
