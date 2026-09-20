import { Link } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { LocationSelector } from '../features/location/LocationSelector'
import { RadiusPicker } from '../features/location/RadiusPicker'
import { useTranslate } from '../i18n'

export function LocationPage() {
  const t = useTranslate()
  const { location, locationLabel, radiusKm, setLocation, setRadiusKm } =
    useAppSession()

  return (
    <div className="page-stack">
      <WorkflowProgress current="location" />
      <header className="page-intro">
        <p className="eyebrow">{t('workflow.stepOf', { current: 2, total: 5 })}</p>
        <h1>{t('location.title')}</h1>
        <p>{t('location.lead')}</p>
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
          {t('location.editPizza')}
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
          {t('location.continue')}
        </Link>
      </div>
    </div>
  )
}
