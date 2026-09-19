import { describe, expect, it, vi } from 'vitest'
import {
  BrowserLocationError,
  type BrowserLocationErrorCode,
  requestBrowserLocation
} from './browser-geolocation'

describe('requestBrowserLocation', () => {
  it('returns validated coordinates with bounded request options', async () => {
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (success, _error, options) => {
        expect(options).toEqual({
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 0
        })
        success(position(32.0809, 34.7806))
      }
    )

    await expect(
      requestBrowserLocation({ getCurrentPosition })
    ).resolves.toEqual({
      latitude: 32.0809,
      longitude: 34.7806
    })
  })

  it('reports unsupported geolocation', async () => {
    await expect(requestBrowserLocation(null)).rejects.toMatchObject({
      code: 'unsupported'
    })
  })

  it.each([
    [1, 'permission-denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
    [99, 'unknown']
  ] as const)(
    'maps browser error code %s to %s',
    async (browserCode, expectedCode) => {
      const getCurrentPosition: Geolocation['getCurrentPosition'] = (
        _success,
        error
      ) => {
        error?.(positionError(browserCode))
      }

      await expect(
        requestBrowserLocation({ getCurrentPosition })
      ).rejects.toSatisfy((error: unknown) => {
        return (
          error instanceof BrowserLocationError &&
          error.code === (expectedCode satisfies BrowserLocationErrorCode)
        )
      })
    }
  )

  it('rejects invalid coordinates', async () => {
    const getCurrentPosition: Geolocation['getCurrentPosition'] = (success) => {
      success(position(91, 34.7806))
    }

    await expect(
      requestBrowserLocation({ getCurrentPosition })
    ).rejects.toMatchObject({
      code: 'unknown'
    })
  })

  it('handles synchronous browser errors', async () => {
    const getCurrentPosition: Geolocation['getCurrentPosition'] = () => {
      throw new Error('browser failure')
    }

    await expect(
      requestBrowserLocation({ getCurrentPosition })
    ).rejects.toMatchObject({
      code: 'unknown'
    })
  })
})

function position (
  latitude: number,
  longitude: number
): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({})
    },
    timestamp: 0,
    toJSON: () => ({})
  }
}

function positionError (code: number): GeolocationPositionError {
  return {
    code,
    message: 'test error',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3
  }
}
