import type { UserLocation } from '@pizzawise/shared'

export function formatCoordinateLabel (location: UserLocation): string {
  return `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
}

export function currentLocationLabel (location: UserLocation): string {
  return `Current location (${formatCoordinateLabel(location)})`
}
