import { pizzaOptionLabel } from '@pizzawise/shared'
import { Link, useNavigate } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { PizzaComparisonPanel } from '../features/comparison/PizzaComparisonPanel'
import { radiusOptionLabel } from '../features/comparison/comparison-options'

export function ComparePage() {
  const {
    user,
    location,
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
      ? 'no toppings'
      : pizza.toppingTags.map(pizzaOptionLabel).join(', ')

  return (
    <div className="page-stack">
      <WorkflowProgress current="compare" />
      <header className="page-intro">
        <p className="eyebrow">Step 3 of 5</p>
        <h1>Compare nearby pies</h1>
        <p>
          Rank shops for this pizza. Order jumps to a focused checkout—log in
          first if you have not already.
        </p>
      </header>
      <section className="surface-card workflow-summary" aria-label="Selected pizza and location">
        <div>
          <h2>Your pizza</h2>
          <p>
            {pizzaOptionLabel(pizza.sizeTag)}, {pizzaOptionLabel(pizza.crustTag)},{' '}
            {pizzaOptionLabel(pizza.sauceTag)}, {toppingSummary}
          </p>
          <Link className="button-secondary" to="/build">
            Edit pizza
          </Link>
        </div>
        <div>
          <h2>Search area</h2>
          <p>Location selected · {radiusOptionLabel(radiusKm)}</p>
          <Link className="button-secondary" to="/location">
            Change location
          </Link>
        </div>
      </section>
      <div className="surface-card">
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
            Log in to order
          </Link>
        </div>
      )}
    </div>
  )
}
