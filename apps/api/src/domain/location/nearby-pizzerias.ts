import type {
  NearbyPizzeria,
  Pizzeria,
  UserLocation
} from '@pizzawise/shared'
import { calculateDistanceKm } from './distance.js'

export function findNearbyPizzerias (
  location: UserLocation,
  pizzerias: readonly Pizzeria[],
  radiusKm?: number
): NearbyPizzeria[] {
  if (
    radiusKm !== undefined &&
    (!Number.isFinite(radiusKm) || radiusKm < 0)
  ) {
    throw new RangeError('Nearby radius must be a finite non-negative number')
  }

  const withDistance = pizzerias
    .map((pizzeria) => ({
      pizzeria,
      distanceKm: calculateDistanceKm(location, {
        latitude: pizzeria.latitude,
        longitude: pizzeria.longitude
      })
    }))

  const inRange =
    radiusKm === undefined
      ? withDistance
      : withDistance.filter(({ distanceKm }) => distanceKm <= radiusKm)

  return inRange.sort((first, second) => {
      const distanceDifference = first.distanceKm - second.distanceKm
      if (distanceDifference !== 0) {
        return distanceDifference
      }

      if (first.pizzeria.id < second.pizzeria.id) {
        return -1
      }
      if (first.pizzeria.id > second.pizzeria.id) {
        return 1
      }
      return 0
    })
}
