import type { LocationSearchResult, UserLocation } from '@pizzawise/shared'
import { type FormEvent, type ReactNode, useState } from 'react'
import { translateEn, type MessageKey, useTranslate } from '../../i18n'
import { radiusOptionLabel, type ComparisonRadiusKm } from '../comparison/comparison-options'
import {
  BrowserLocationError,
  type BrowserLocationErrorCode,
  type BrowserGeolocation,
  requestBrowserLocation
} from './browser-geolocation'
import {
  currentLocationLabel,
  displayLocationLabel
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

const ERROR_KEYS: Record<BrowserLocationErrorCode, MessageKey> = {
  'permission-denied': 'location.permissionDenied',
  unsupported: 'location.unsupported',
  timeout: 'location.timeout',
  unavailable: 'location.unavailable',
  unknown: 'location.unknown'
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
  const t = useTranslate()
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
    location !== null
      ? displayLocationLabel(location, locationLabel, t)
      : null

  async function handleUseLocation() {
    setIsLoading(true)
    setErrorCode(null)
    setResults([])
    setManualMessage(null)

    try {
      const selectedLocation = await requestBrowserLocation(geolocation)
      let label = currentLocationLabel(selectedLocation, translateEn)
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
      setManualMessage(t('location.enterQuery'))
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
        setManualMessage(t('location.noneFound'))
      }
    } catch (error) {
      setManualMessage(
        error instanceof LocationSearchError && error.code === 'rate-limited'
          ? t('location.rateLimited')
          : t('location.searchFailed')
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
          <h2 id="location-heading">{t('location.yourLocation')}</h2>
          <p>{displayLabel}</p>
          {radiusKm !== undefined && (
            <p>
              {t('location.searchRadiusValue', {
                radius: radiusOptionLabel(radiusKm, t)
              })}
            </p>
          )}
          <button
            type="button"
            className="button-secondary"
            onClick={() => setIsEditing(true)}
          >
            {t('location.change')}
          </button>
        </div>
      ) : (
        <>
          <h2 id="location-heading">{t('location.heading')}</h2>
          <div className="location-layout">
            <div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleUseLocation()}
              >
                {isLoading ? t('location.locating') : t('location.useMine')}
              </button>

              <p>{t('location.or')}</p>

              <form onSubmit={(event) => void handleManualSearch(event)}>
                <label htmlFor="manual-location">{t('location.cityOrAddress')}</label>
                <input
                  id="manual-location"
                  type="text"
                  value={manualQuery}
                  maxLength={200}
                  onChange={(event) => setManualQuery(event.target.value)}
                />
                <button type="submit" disabled={isSearching}>
                  {isSearching ? t('location.searching') : t('location.search')}
                </button>
              </form>

              {results.length > 0 && (
                <ul aria-label={t('location.resultsAria')}>
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
        {errorCode !== null && <p role="alert">{t(ERROR_KEYS[errorCode])}</p>}
        {manualMessage !== null && <p role="alert">{manualMessage}</p>}
      </div>
    </section>
  )
}
