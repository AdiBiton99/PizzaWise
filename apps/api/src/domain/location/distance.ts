import type { UserLocation } from '@pizzawise/shared'

const MEAN_EARTH_RADIUS_KM = 6371.0088
const DEGREES_TO_RADIANS = Math.PI / 180

export function calculateDistanceKm (
  first: UserLocation,
  second: UserLocation
): number {
  assertValidLocation(first)
  assertValidLocation(second)

  const firstLatitude = first.latitude * DEGREES_TO_RADIANS
  const secondLatitude = second.latitude * DEGREES_TO_RADIANS
  const latitudeDifference =
    (second.latitude - first.latitude) * DEGREES_TO_RADIANS
  const longitudeDifference =
    (second.longitude - first.longitude) * DEGREES_TO_RADIANS

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2

  const boundedHaversine = Math.min(1, Math.max(0, haversine))
  const centralAngle =
    2 *
    Math.atan2(
      Math.sqrt(boundedHaversine),
      Math.sqrt(1 - boundedHaversine)
    )

  return MEAN_EARTH_RADIUS_KM * centralAngle
}

function assertValidLocation (location: UserLocation): void {
  if (
    !Number.isFinite(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    !Number.isFinite(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new RangeError('Location coordinates are invalid')
  }
}
