import {
  compareFavoritesByNameThenId,
  type FavoriteRecord,
  type FavoriteStore
} from './favorite-store.js'

export class MemoryFavoriteStore implements FavoriteStore {
  readonly #byId = new Map<string, FavoriteRecord>()

  async listByUserId (userId: string): Promise<readonly FavoriteRecord[]> {
    return [...this.#byId.values()]
      .filter((favorite) => favorite.userId === userId)
      .sort(compareFavoritesByNameThenId)
  }

  async create (favorite: FavoriteRecord): Promise<void> {
    this.#byId.set(favorite.id, favorite)
  }

  async update (userId: string, favorite: FavoriteRecord): Promise<boolean> {
    const existing = this.#byId.get(favorite.id)
    if (existing === undefined || existing.userId !== userId) {
      return false
    }

    this.#byId.set(favorite.id, favorite)
    return true
  }

  async delete (userId: string, id: string): Promise<boolean> {
    const existing = this.#byId.get(id)
    if (existing === undefined || existing.userId !== userId) {
      return false
    }

    this.#byId.delete(id)
    return true
  }
}
