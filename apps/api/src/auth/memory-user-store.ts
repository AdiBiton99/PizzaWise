import { DuplicateEmailError, type UserRecord, type UserStore } from './user-store.js'

export class MemoryUserStore implements UserStore {
  readonly #byId = new Map<string, UserRecord>()
  readonly #byEmail = new Map<string, UserRecord>()

  async create (user: UserRecord): Promise<void> {
    if (this.#byEmail.has(user.email)) {
      throw new DuplicateEmailError()
    }

    this.#byId.set(user.id, user)
    this.#byEmail.set(user.email, user)
  }

  async findByEmail (email: string): Promise<UserRecord | null> {
    return this.#byEmail.get(email) ?? null
  }

  async findById (id: string): Promise<UserRecord | null> {
    return this.#byId.get(id) ?? null
  }
}
