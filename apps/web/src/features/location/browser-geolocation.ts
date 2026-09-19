import type { UserLocation } from '@pizzawise/shared'

export type BrowserLocationErrorCode =
  | 'permission-denied'
  | 'unsupported'
  | 'timeout'
  | 'unavailable'
  | 'unknown'

export class BrowserLocationError extends Error {
  readonly code: BrowserLocationErrorCode

  constructor (code: BrowserLocationErrorCode, message: string) {
    super(message)
    this.name = 'BrowserLocationError'
    this.code = code
  }
}

export interface BrowserGeolocation {
  getCurrentPosition: Geolocation['getCurrentPosition']
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 0
}

export function requestBrowserLocation (
  geolocation: BrowserGeolocation | null | undefined = browserGeolocation()
): Promise<UserLocation> {
  if (geolocation === null || geolocation === undefined) {
    return Promise.reject(
      new BrowserLocationError(
        'unsupported',
        'Geolocation is not supported by this browser.'
      )
    )
  }

  return new Promise((resolve, reject) => {
    try {
      geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }

          if (!isValidLocation(location)) {
            reject(
              new BrowserLocationError(
                'unknown',
                'The browser returned an invalid location.'
              )
            )
            return
          }

          resolve(location)
        },
        (error) => reject(browserLocationError(error)),
        GEOLOCATION_OPTIONS
      )
    } catch {
      reject(
        new BrowserLocationError(
          'unknown',
          'The browser could not request a location.'
        )
      )
    }
  })
}

function browserGeolocation (): BrowserGeolocation | null {
  if (typeof navigator === 'undefined' || navigator.geolocation === undefined) {
    return null
  }

  return navigator.geolocation
}

function isValidLocation (location: UserLocation): boolean {
  return (
    Number.isFinite(location.latitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    Number.isFinite(location.longitude) &&
    location.longitude >= -180 &&
    location.longitude <= 180
  )
}

function browserLocationError (
  error: GeolocationPositionError
): BrowserLocationError {
  switch (error.code) {
    case 1:
      return new BrowserLocationError(
        'permission-denied',
        'Location permission was denied.'
      )
    case 2:
      return new BrowserLocationError(
        'unavailable',
        'Your location is currently unavailable.'
      )
    case 3:
      return new BrowserLocationError(
        'timeout',
        'The location request timed out.'
      )
    default:
      return new BrowserLocationError(
        'unknown',
        'The browser could not determine your location.'
      )
  }
}
