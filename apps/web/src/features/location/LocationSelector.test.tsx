import type { LocationSearchResult } from '@pizzawise/shared'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocationSearchError } from './location-api'
import { LocationSelector } from './LocationSelector'

afterEach(cleanup)

describe('LocationSelector', () => {
  it('requests location only after the user clicks', async () => {
    let successCallback: PositionCallback | undefined
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (success) => {
        successCallback = success
      }
    )
    const onLocationSelected = vi.fn()

    render(
      <LocationSelector
        location={null}
        geolocation={{ getCurrentPosition }}
        reverseGeocode={async () => null}
        onLocationSelected={onLocationSelected}
      />
    )

    expect(getCurrentPosition).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    expect(getCurrentPosition).toHaveBeenCalledOnce()
    expect(
      (screen.getByRole('button', { name: 'Locating…' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)

    await act(async () => {
      successCallback?.(position(32.0809, 34.7806))
    })

    expect(onLocationSelected).toHaveBeenCalledWith(
      {
        latitude: 32.0809,
        longitude: 34.7806
      },
      'Current location (32.081, 34.781)'
    )
  })

  it('stores a reverse-geocoded address after using browser location', async () => {
    let successCallback: PositionCallback | undefined
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (success) => {
        successCallback = success
      }
    )
    const onLocationSelected = vi.fn()
    const reverseGeocode = vi.fn(async () => 'Rothschild Boulevard, Tel Aviv, Israel')

    render(
      <LocationSelector
        location={null}
        geolocation={{ getCurrentPosition }}
        reverseGeocode={reverseGeocode}
        onLocationSelected={onLocationSelected}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    await act(async () => {
      successCallback?.(position(32.0809, 34.7806))
    })

    expect(reverseGeocode).toHaveBeenCalledWith({
      latitude: 32.0809,
      longitude: 34.7806
    })
    expect(onLocationSelected).toHaveBeenCalledWith(
      {
        latitude: 32.0809,
        longitude: 34.7806
      },
      'Rothschild Boulevard, Tel Aviv, Israel'
    )
  })

  it('collapses the search form after a location is selected', async () => {
    let successCallback: PositionCallback | undefined
    const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>(
      (success) => {
        successCallback = success
      }
    )
    const selected = { latitude: 32.0809, longitude: 34.7806 }

    const { rerender } = render(
      <LocationSelector
        location={null}
        geolocation={{ getCurrentPosition }}
        reverseGeocode={async () => null}
        onLocationSelected={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    await act(async () => {
      successCallback?.(position(32.0809, 34.7806))
    })

    rerender(
      <LocationSelector
        location={selected}
        locationLabel="Current location (32.081, 34.781)"
        geolocation={{ getCurrentPosition }}
        onLocationSelected={vi.fn()}
      />
    )

    expect(screen.getByText('Your location')).toBeTruthy()
    expect(screen.getByText('Current location (32.081, 34.781)')).toBeTruthy()
    expect(screen.queryByText('Search radius: 5 km')).toBeNull()
    expect(screen.queryByLabelText('City or address')).toBeNull()
    expect(screen.queryByText('Location selected.')).toBeNull()
    expect(screen.queryByText(/32\.0809|34\.7806/)).toBeNull()
  })

  it('reopens the location search form when Change location is clicked', () => {
    render(
      <LocationSelector
        location={{ latitude: 32.0809, longitude: 34.7806 }}
        locationLabel="Dizengoff Street 100, Tel Aviv-Yafo, Israel"
        geolocation={null}
        onLocationSelected={vi.fn()}
      />
    )

    expect(screen.queryByLabelText('City or address')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Change location' }))

    expect(screen.getByLabelText('City or address')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeTruthy()
  })

  it('shows a readable coordinate fallback without displaying precise coordinates', () => {
    render(
      <LocationSelector
        location={{ latitude: 32.0809, longitude: 34.7806 }}
        geolocation={null}
        onLocationSelected={vi.fn()}
      />
    )

    expect(screen.getByText('Your location')).toBeTruthy()
    expect(screen.getByText('Current location (32.081, 34.781)')).toBeTruthy()
    expect(screen.queryByText('Location selected.')).toBeNull()
    expect(screen.queryByText(/32\.0809|34\.7806/)).toBeNull()
  })

  it('shows permission errors from a fake geolocation provider', async () => {
    const getCurrentPosition: Geolocation['getCurrentPosition'] = (
      _success,
      error
    ) => {
      error?.({
        code: 1,
        message: 'denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      })
    }

    render(
      <LocationSelector
        location={null}
        geolocation={{ getCurrentPosition }}
        onLocationSelected={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Location permission was denied.'
    )
  })

  it('shows unsupported geolocation without requesting permission', async () => {
    render(
      <LocationSelector
        location={null}
        geolocation={null}
        onLocationSelected={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Geolocation is not supported by this browser.'
    )
  })

  it('searches manually and waits for candidate selection', async () => {
    let resolveSearch:
      | ((results: readonly LocationSearchResult[]) => void)
      | undefined
    const searchLocations = vi.fn(
      async () =>
        await new Promise<readonly LocationSearchResult[]>((resolve) => {
          resolveSearch = resolve
        })
    )
    const onLocationSelected = vi.fn()

    render(
      <LocationSelector
        location={null}
        geolocation={null}
        searchLocations={searchLocations}
        onLocationSelected={onLocationSelected}
      />
    )

    fireEvent.change(screen.getByLabelText('City or address'), {
      target: { value: '  Dizengoff 100, Tel Aviv  ' }
    })
    expect(searchLocations).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(searchLocations).toHaveBeenCalledWith('Dizengoff 100, Tel Aviv')
    expect(
      (screen.getByRole('button', { name: 'Searching…' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)

    await act(async () => {
      resolveSearch?.([
        {
          label: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel',
          location: {
            latitude: 32.0809,
            longitude: 34.7806
          }
        }
      ])
    })

    expect(onLocationSelected).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel'
      })
    )

    expect(onLocationSelected).toHaveBeenCalledWith(
      {
        latitude: 32.0809,
        longitude: 34.7806
      },
      'Dizengoff Street 100, Tel Aviv-Yafo, Israel'
    )
  })

  it('rejects an empty manual query without searching', async () => {
    const searchLocations = vi.fn()

    render(
      <LocationSelector
        location={null}
        geolocation={null}
        searchLocations={searchLocations}
        onLocationSelected={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(searchLocations).not.toHaveBeenCalled()
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Enter a city or address.'
    )
  })

  it('shows a no-results message', async () => {
    render(
      <LocationSelector
        location={null}
        geolocation={null}
        searchLocations={async () => []}
        onLocationSelected={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('City or address'), {
      target: { value: 'Unknown place' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No locations found.'
    )
  })

  it('shows manual location search errors', async () => {
    render(
      <LocationSelector
        location={null}
        geolocation={null}
        searchLocations={async () => {
          throw new Error('request failed')
        }}
        onLocationSelected={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('City or address'), {
      target: { value: 'Tel Aviv' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Location search failed. Please try again.'
    )
  })

  it('shows a distinct message when location search is rate limited', async () => {
    render(
      <LocationSelector
        location={null}
        geolocation={null}
        searchLocations={async () => {
          throw new LocationSearchError(
            'rate-limited',
            'Location search is temporarily rate limited.'
          )
        }}
        onLocationSelected={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('City or address'), {
      target: { value: 'Tel Aviv' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Too many location searches. Please try again later.'
    )
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
