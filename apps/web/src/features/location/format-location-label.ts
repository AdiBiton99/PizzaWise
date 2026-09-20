import type { UserLocation } from '@pizzawise/shared'
import { translateEn, type Translate } from '../../i18n'

export function formatCoordinateLabel (location: UserLocation): string {
  return `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
}

export function currentLocationLabel (
  location: UserLocation,
  t: Translate = translateEn
): string {
  return t('location.current', { coords: formatCoordinateLabel(location) })
}

export function displayLocationLabel (
  location: UserLocation,
  storedLabel: string | null | undefined,
  t: Translate
): string {
  const fallback = currentLocationLabel(location)
  if (storedLabel === null || storedLabel === undefined || storedLabel === fallback) {
    return currentLocationLabel(location, t)
  }

  const englishFallback = currentLocationLabel(location, translateEn)
  if (storedLabel === englishFallback) {
    return currentLocationLabel(location, t)
  }

  return storedLabel
}
