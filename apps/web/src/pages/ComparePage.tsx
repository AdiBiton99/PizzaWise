import { Link, useNavigate } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { PizzaComparisonPanel } from '../features/comparison/PizzaComparisonPanel'
import { radiusOptionLabel } from '../features/comparison/comparison-options'
import { displayLocationLabel } from '../features/location/format-location-label'
import { optionLabel, useTranslate } from '../i18n'

export function ComparePage() {
  const t = useTranslate()
  const {
    user,
    location,
    locationLabel,
    pizza,
    radiusKm,
    ranking,
    comparisonOutcome,
    setRanking,
    setComparisonOutcome,
    setCheckoutPizzeriaId
  } = useAppSession()
  const navigate = useNavigate()

  if (pizza === null || location === null) {
    return null
  }

  const toppingSummary =
    pizza.toppingTags.length === 0
      ? t('compare.noToppings')
      : pizza.toppingTags.map((tag) => optionLabel(t, tag)).join(', ')

  const searchLabel = displayLocationLabel(location, locationLabel, t)

  return (
    <div className="page-stack compare-page">
      <WorkflowProgress current="compare" />
      <header className="page-intro">
        <p className="eyebrow">{t('workflow.stepOf', { current: 3, total: 5 })}</p>
        <h1>{t('compare.title')}</h1>
        <p>{t('compare.lead')}</p>
      </header>
      <section
        className="surface-card workflow-summary compact-summary"
        aria-label={t('compare.summaryAria')}
      >
        <div>
          <h2>{t('compare.yourPizza')}</h2>
          <p>
            {optionLabel(t, pizza.sizeTag)}, {optionLabel(t, pizza.crustTag)},{' '}
            {optionLabel(t, pizza.sauceTag)}, {toppingSummary}
          </p>
          <Link className="button-secondary" to="/build">
            {t('location.editPizza')}
          </Link>
        </div>
        <div>
          <h2>{t('compare.searchArea')}</h2>
          <p>{searchLabel}</p>
          <p>
            {t('location.searchRadiusValue', {
              radius: radiusOptionLabel(radiusKm, t)
            })}
          </p>
          <Link className="button-secondary" to="/location">
            {t('location.change')}
          </Link>
        </div>
      </section>
      <div className="surface-card comparison-workspace">
        <PizzaComparisonPanel
          user={user}
          location={location}
          pizza={pizza}
          radiusKm={radiusKm}
          ranking={ranking}
          onRankingChange={setRanking}
          outcome={comparisonOutcome}
          onOutcomeChange={setComparisonOutcome}
          onChoosePizzeria={(pizzeriaId) => {
            setCheckoutPizzeriaId(pizzeriaId)
            void navigate('/checkout')
          }}
        />
      </div>
      {user === null && (
        <div className="builder-actions">
          <Link className="button-primary" to="/account?mode=login">
            {t('compare.loginToOrder')}
          </Link>
        </div>
      )}
    </div>
  )
}
