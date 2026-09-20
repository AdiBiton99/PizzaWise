import type { LocationSearchResult, UserLocation } from '@pizzawise/shared'
import { type FormEvent, type ReactNode, useState } from 'react'
import { radiusOptionLabel, type ComparisonRadiusKm } from '../comparison/comparison-options'
import {
  BrowserLocationError,
  type BrowserLocationErrorCode,
  type BrowserGeolocation,
  requestBrowserLocation
} from './browser-geolocation'
import {
  currentLocationLabel
} from './format-location-label'
import {
  LocationSearchError,
  reverseGeocode as reverseGeocodeLocation,
  type ReverseGeocode,
  type SearchLocations,
  searchLocations as searchManualLocations
} from './location-api'

interface LocationSelectorProps {
  readonly location: UserLocation | null
  readonly locationLabel?: string | null
  readonly radiusKm?: ComparisonRadiusKm
  readonly onLocationSelected: (location: UserLocation, label: string) => void
  readonly geolocation?: BrowserGeolocation | null
  readonly searchLocations?: SearchLocations
  readonly reverseGeocode?: ReverseGeocode
  readonly children?: ReactNode
}

const ERROR_MESSAGES: Record<BrowserLocationErrorCode, string> = {
  'permission-denied': 'Location permission was denied.',
  unsupported: 'Geolocation is not supported by this browser.',
  timeout: 'The location request timed out. Please try again.',
  unavailable: 'Your location is currently unavailable.',
  unknown: 'We could not determine your location.'
}

export function LocationSelector({
  location,
  locationLabel = null,
  radiusKm,
  onLocationSelected,
  geolocation,
  searchLocations = searchManualLocations,
  reverseGeocode = reverseGeocodeLocation,
  children
}: LocationSelectorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorCode, setErrorCode] =
    useState<BrowserLocationErrorCode | null>(null)
  const [manualQuery, setManualQuery] = useState('')
  const [results, setResults] =
    useState<readonly LocationSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [manualMessage, setManualMessage] = useState<string | null>(null)

  const showSummary = location !== null && !isEditing
  const displayLabel =
    locationLabel ?? (location !== null ? currentLocationLabel(location) : null)

  async function handleUseLocation() {
    setIsLoading(true)
    setErrorCode(null)
    setResults([])
    setManualMessage(null)

    try {
      const selectedLocation = await requestBrowserLocation(geolocation)
      let label = currentLocationLabel(selectedLocation)
      try {
        const resolvedLabel = await reverseGeocode(selectedLocation)
        if (resolvedLabel !== null && resolvedLabel.length > 0) {
          label = resolvedLabel
        }
      } catch {
        // Keep the coordinate fallback when reverse geocoding is unavailable.
      }
      onLocationSelected(selectedLocation, label)
      setIsEditing(false)
    } catch (error) {
      setErrorCode(
        error instanceof BrowserLocationError ? error.code : 'unknown'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleManualSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = manualQuery.trim()

    if (query.length === 0) {
      setResults([])
      setManualMessage('Enter a city or address.')
      return
    }

    setIsSearching(true)
    setErrorCode(null)
    setResults([])
    setManualMessage(null)

    try {
      const nextResults = await searchLocations(query)
      setResults(nextResults)
      if (nextResults.length === 0) {
        setManualMessage('No locations found.')
      }
    } catch (error) {
      setManualMessage(
        error instanceof LocationSearchError && error.code === 'rate-limited'
          ? 'Too many location searches. Please try again later.'
          : 'Location search failed. Please try again.'
      )
    } finally {
      setIsSearching(false)
    }
  }

  function handleCandidateSelected(result: LocationSearchResult) {
    onLocationSelected(result.location, result.label)
    setErrorCode(null)
    setResults([])
    setManualMessage(null)
    setIsEditing(false)
  }

  return (
    <section className="location-selector" aria-labelledby="location-heading">
      {showSummary ? (
        <div className="selected-location-summary">
          <h2 id="location-heading">Your location</h2>
          <p>{displayLabel}</p>
          {radiusKm !== undefined && (
            <p>Search radius: {radiusOptionLabel(radiusKm)}</p>
          )}
          <button
            type="button"
            className="button-secondary"
            onClick={() => setIsEditing(true)}
          >
            Change location
          </button>
        </div>
      ) : (
        <>
          <h2 id="location-heading">Location</h2>
          <div className="location-layout">
            <div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleUseLocation()}
              >
                {isLoading ? 'Locating…' : 'Use my location'}
              </button>

              <p>or</p>

              <form onSubmit={(event) => void handleManualSearch(event)}>
                <label htmlFor="manual-location">City or address</label>
                <input
                  id="manual-location"
                  type="text"
                  value={manualQuery}
                  maxLength={200}
                  onChange={(event) => setManualQuery(event.target.value)}
                />
                <button type="submit" disabled={isSearching}>
                  {isSearching ? 'Searching…' : 'Search'}
                </button>
              </form>

              {results.length > 0 && (
                <ul aria-label="Location results">
                  {results.map((result, index) => (
                    <li key={`${result.label}-${index}`}>
                      <button
                        type="button"
                        onClick={() => handleCandidateSelected(result)}
                      >
                        {result.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {children}
          </div>
        </>
      )}

      <div className="location-status" aria-live="polite">
        {errorCode !== null && <p role="alert">{ERROR_MESSAGES[errorCode]}</p>}
        {manualMessage !== null && <p role="alert">{manualMessage}</p>}
      </div>
    </section>
  )
}
