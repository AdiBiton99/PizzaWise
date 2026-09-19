import type { ProfileRecord, ProfileStore } from './profile-store.js'

export class MemoryProfileStore implements ProfileStore {
  readonly #byUserId = new Map<string, ProfileRecord>()

  async findByUserId (userId: string): Promise<ProfileRecord | null> {
    return this.#byUserId.get(userId) ?? null
  }

  async upsert (profile: ProfileRecord): Promise<void> {
    this.#byUserId.set(profile.userId, profile)
  }
}
