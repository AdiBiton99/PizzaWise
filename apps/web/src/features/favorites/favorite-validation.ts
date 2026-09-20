export const MIN_FAVORITE_NAME_LENGTH = 1
export const MAX_FAVORITE_NAME_LENGTH = 80

export function validateFavoriteName (
  name: string
): 'validation.favoriteNameLength' | null {
  const normalized = name.trim()
  if (
    normalized.length < MIN_FAVORITE_NAME_LENGTH ||
    normalized.length > MAX_FAVORITE_NAME_LENGTH
  ) {
    return 'validation.favoriteNameLength'
  }

  return null
}
