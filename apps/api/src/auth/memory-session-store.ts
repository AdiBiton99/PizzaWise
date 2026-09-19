import type { SessionRecord, SessionStore } from './session-store.js'

export class MemorySessionStore implements SessionStore {
  readonly #byTokenHash = new Map<string, SessionRecord>()

  async create (session: SessionRecord): Promise<void> {
    this.#byTokenHash.set(session.tokenHash, session)
  }

  async findByTokenHash (tokenHash: string): Promise<SessionRecord | null> {
    return this.#byTokenHash.get(tokenHash) ?? null
  }

  async deleteByTokenHash (tokenHash: string): Promise<void> {
    this.#byTokenHash.delete(tokenHash)
  }

  get size (): number {
    return this.#byTokenHash.size
  }
}
