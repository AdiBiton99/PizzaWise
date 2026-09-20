import { Link } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { LocationSelector } from '../features/location/LocationSelector'
import { RadiusPicker } from '../features/location/RadiusPicker'

export function LocationPage() {
  const { location, locationLabel, radiusKm, setLocation, setRadiusKm } =
    useAppSession()

  return (
    <div className="page-stack">
      <WorkflowProgress current="location" />
      <header className="page-intro">
        <p className="eyebrow">Step 2 of 5</p>
        <h1>Where should we search?</h1>
        <p>
          Use your current spot or search an address, then choose how far to
          look. All includes every listed pizzeria, regardless of distance.
        </p>
      </header>
      <div className="surface-card">
        <LocationSelector
          location={location}
          locationLabel={locationLabel}
          radiusKm={radiusKm}
          onLocationSelected={setLocation}
        >
          <RadiusPicker radiusKm={radiusKm} onChange={setRadiusKm} />
        </LocationSelector>
      </div>
      <div className="builder-actions">
        <Link className="button-secondary" to="/build">
          Edit pizza
        </Link>
        <Link
          className={location === null ? 'button-primary is-disabled' : 'button-primary'}
          to="/compare"
          aria-disabled={location === null}
          onClick={(event) => {
            if (location === null) {
              event.preventDefault()
            }
          }}
        >
          Continue to compare
        </Link>
      </div>
    </div>
  )
}
