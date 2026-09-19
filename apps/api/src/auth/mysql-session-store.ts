import { eq } from 'drizzle-orm'
import type { Database } from '../db/index.js'
import { sessions } from '../db/schema.js'
import type { SessionRecord, SessionStore } from './session-store.js'

export class MysqlSessionStore implements SessionStore {
  readonly #db: Database

  constructor (db: Database) {
    this.#db = db
  }

  async create (session: SessionRecord): Promise<void> {
    await this.#db.insert(sessions).values({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    })
  }

  async findByTokenHash (tokenHash: string): Promise<SessionRecord | null> {
    const rows = await this.#db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1)

    return rows[0] === undefined ? null : toSessionRecord(rows[0])
  }

  async deleteByTokenHash (tokenHash: string): Promise<void> {
    await this.#db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  }
}

function toSessionRecord (row: typeof sessions.$inferSelect): SessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt
  }
}
