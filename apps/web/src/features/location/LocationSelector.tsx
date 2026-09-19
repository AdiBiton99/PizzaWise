import type { LocationSearchResult, UserLocation } from '@pizzawise/shared'
import { type FormEvent, useState } from 'react'
import {
  BrowserLocationError,
  type BrowserLocationErrorCode,
  type BrowserGeolocation,
  requestBrowserLocation
} from './browser-geolocation'
import {
  LocationSearchError,
  type SearchLocations,
  searchLocations as searchManualLocations
} from './location-api'

interface LocationSelectorProps {
  readonly location: UserLocation | null
  readonly onLocationSelected: (location: UserLocation) => void
  readonly geolocation?: BrowserGeolocation | null
  readonly searchLocations?: SearchLocations
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
  onLocationSelected,
  geolocation,
  searchLocations = searchManualLocations
}: LocationSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorCode, setErrorCode] =
    useState<BrowserLocationErrorCode | null>(null)
  const [manualQuery, setManualQuery] = useState('')
  const [results, setResults] =
    useState<readonly LocationSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [manualMessage, setManualMessage] = useState<string | null>(null)

  async function handleUseLocation() {
    setIsLoading(true)
    setErrorCode(null)
    setResults([])
    setManualMessage(null)

    try {
      const selectedLocation = await requestBrowserLocation(geolocation)
      onLocationSelected(selectedLocation)
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
    onLocationSelected(result.location)
    setErrorCode(null)
    setResults([])
    setManualMessage(null)
  }

  return (
    <section className="location-selector" aria-labelledby="location-heading">
      <h2 id="location-heading">Location</h2>
      <button
        type="button"
        disabled={isLoading}
        onClick={handleUseLocation}
      >
        {isLoading ? 'Locating…' : 'Use my location'}
      </button>

      <p>or</p>

      <form onSubmit={handleManualSearch}>
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

      <div className="location-status" aria-live="polite">
        {location !== null && errorCode === null && <p>Location selected.</p>}
        {errorCode !== null && <p role="alert">{ERROR_MESSAGES[errorCode]}</p>}
        {manualMessage !== null && <p role="alert">{manualMessage}</p>}
      </div>
    </section>
  )
}
