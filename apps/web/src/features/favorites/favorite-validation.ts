export const MIN_FAVORITE_NAME_LENGTH = 1
export const MAX_FAVORITE_NAME_LENGTH = 80

export function validateFavoriteName (name: string): string | null {
  const normalized = name.trim()
  if (
    normalized.length < MIN_FAVORITE_NAME_LENGTH ||
    normalized.length > MAX_FAVORITE_NAME_LENGTH
  ) {
    return `Favorite name must be between ${MIN_FAVORITE_NAME_LENGTH} and ${MAX_FAVORITE_NAME_LENGTH} characters`
  }

  return null
}
