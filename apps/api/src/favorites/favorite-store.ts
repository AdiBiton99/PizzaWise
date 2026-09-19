import type { PizzaConfiguration } from '@pizzawise/shared'

export interface FavoriteRecord {
  readonly id: string
  readonly userId: string
  readonly name: string
  readonly configuration: PizzaConfiguration
}

export interface FavoriteStore {
  listByUserId(userId: string): Promise<readonly FavoriteRecord[]>
  create(favorite: FavoriteRecord): Promise<void>
  update(userId: string, favorite: FavoriteRecord): Promise<boolean>
  delete(userId: string, id: string): Promise<boolean>
}

export function compareFavoritesByNameThenId (
  left: FavoriteRecord,
  right: FavoriteRecord
): number {
  const byName = left.name.localeCompare(right.name)
  if (byName !== 0) {
    return byName
  }

  return left.id.localeCompare(right.id)
}

export function sortedToppingTags (
  toppingTags: readonly string[]
): readonly string[] {
  return [...toppingTags].sort((left, right) => left.localeCompare(right))
}
