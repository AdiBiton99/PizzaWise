import type {
  ComparisonPriority,
  PizzaConfiguration,
  PublicUser,
  RankedPizza,
  UserLocation
} from '@pizzawise/shared'
import { useState } from 'react'
import type { ComparePizzas } from './comparison-api'
import { comparePizzas as requestComparison } from './comparison-api'
import {
  formatDistanceKm,
  formatEta,
  formatPrice
} from './comparison-format'
import {
  DEFAULT_COMPARISON_RADIUS_KM,
  type ComparisonRadiusKm
} from './comparison-options'

export type RankingChoice = 'balanced' | ComparisonPriority

export type ComparisonOutcome =
  | {
      readonly location: UserLocation
      readonly pizza: PizzaConfiguration
      readonly kind: 'success'
      readonly ranked: readonly RankedPizza[]
      readonly uncheckedPizzeriaCount: number
    }
  | {
      readonly location: UserLocation
      readonly pizza: PizzaConfiguration
      readonly kind: 'error'
      readonly message: string
    }

interface PizzaComparisonPanelProps {
  readonly user: PublicUser | null
  readonly location: UserLocation | null
  readonly pizza: PizzaConfiguration | null
  readonly radiusKm?: ComparisonRadiusKm
  readonly ranking?: RankingChoice
  readonly onRankingChange?: (ranking: RankingChoice) => void
  readonly outcome?: ComparisonOutcome | null
  readonly onOutcomeChange?: (outcome: ComparisonOutcome | null) => void
  readonly onChoosePizzeria?: (pizzeriaId: string) => void
  readonly comparePizzas?: ComparePizzas
}

export function PizzaComparisonPanel({
  user,
  location,
  pizza,
  radiusKm = DEFAULT_COMPARISON_RADIUS_KM,
  ranking: rankingProp,
  onRankingChange,
  outcome: outcomeProp,
  onOutcomeChange,
  onChoosePizzeria,
  comparePizzas = requestComparison
}: PizzaComparisonPanelProps) {
  const [internalRanking, setInternalRanking] = useState<RankingChoice>('balanced')
  const [isLoading, setIsLoading] = useState(false)
  const [internalOutcome, setInternalOutcome] = useState<ComparisonOutcome | null>(
    null
  )

  const ranking = rankingProp ?? internalRanking
  const setRanking = onRankingChange ?? setInternalRanking
  const outcome = onOutcomeChange === undefined ? internalOutcome : (outcomeProp ?? null)
  const setOutcome = onOutcomeChange ?? setInternalOutcome

  const currentOutcome =
    outcome !== null &&
    location !== null &&
    pizza !== null &&
    outcome.location === location &&
    outcome.pizza === pizza
      ? outcome
      : null

  const canCompare = location !== null && pizza !== null && !isLoading
  const missingMessage = missingRequirementsMessage(location, pizza)

  async function handleCompare() {
    if (location === null || pizza === null || isLoading) {
      return
    }

    const requestedLocation = location
    const requestedPizza = pizza
    setIsLoading(true)

    try {
      const result = await comparePizzas({
        location: requestedLocation,
        configuration: requestedPizza,
        ...(radiusKm === 'all' ? {} : { radiusKm }),
        ...(ranking === 'balanced' ? {} : { priority: ranking })
      })
      setOutcome({
        location: requestedLocation,
        pizza: requestedPizza,
        kind: 'success',
        ranked: result.ranked,
        uncheckedPizzeriaCount: result.uncheckedPizzeriaCount
      })
    } catch {
      setOutcome({
        location: requestedLocation,
        pizza: requestedPizza,
        kind: 'error',
        message: 'Comparison failed. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="pizza-comparison" aria-labelledby="comparison-heading">
      <h2 id="comparison-heading">Compare nearby pizzas</h2>

      <fieldset className="builder-options option-pills">
        <legend>Ranking</legend>
        <ul>
          {(
            [
              ['balanced', 'Balanced'],
              ['price', 'Price'],
              ['distance', 'Distance'],
              ['eta', 'ETA']
            ] as const
          ).map(([value, label]) => (
            <li key={value}>
              <label className={ranking === value ? 'is-selected' : undefined}>
                <input
                  type="radio"
                  name="comparison-priority"
                  value={value}
                  checked={ranking === value}
                  onChange={() => setRanking(value)}
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="builder-actions">
        <button
          type="button"
          className="button-primary"
          disabled={!canCompare}
          onClick={() => void handleCompare()}
        >
          {isLoading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      <div className="comparison-status" aria-live="polite" aria-busy={isLoading}>
        {missingMessage !== null && !isLoading && currentOutcome === null && (
          <p>{missingMessage}</p>
        )}
        {isLoading && <p>Comparing nearby pizzerias…</p>}
        {currentOutcome?.kind === 'error' && (
          <p role="alert">{currentOutcome.message}</p>
        )}
        {currentOutcome?.kind === 'success' &&
          currentOutcome.uncheckedPizzeriaCount > 0 && (
          <p>
            Some nearby pizzerias could not be checked. Try Compare again.
          </p>
        )}
        {currentOutcome?.kind === 'success' &&
          currentOutcome.ranked.length === 0 &&
          currentOutcome.uncheckedPizzeriaCount === 0 && (
          <p>No matching pizzas nearby.</p>
        )}
      </div>

      {currentOutcome?.kind === 'success' && currentOutcome.ranked.length > 0 && (
        <ol className="comparison-results" aria-label="Ranked pizzerias">
          {currentOutcome.ranked.map((pizzaResult) => (
            <li
              className="surface-card"
              key={`${pizzaResult.rank}-${pizzaResult.nearby.pizzeria.id}`}
            >
              <h3>
                {pizzaResult.rank}. {pizzaResult.nearby.pizzeria.name}
              </h3>
              <dl>
                <div>
                  <dt>Price</dt>
                  <dd>{formatPrice(pizzaResult.total)}</dd>
                </div>
                <div>
                  <dt>Distance</dt>
                  <dd>{formatDistanceKm(pizzaResult.nearby.distanceKm)}</dd>
                </div>
                <div>
                  <dt>ETA</dt>
                  <dd>{formatEta(pizzaResult.nearby.pizzeria.averageEta)}</dd>
                </div>
              </dl>
              {user === null ? (
                <p>Sign in to order.</p>
              ) : (
                <div className="builder-actions">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() =>
                      onChoosePizzeria?.(pizzaResult.nearby.pizzeria.id)
                    }
                  >
                    Order
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function missingRequirementsMessage (
  location: UserLocation | null,
  pizza: PizzaConfiguration | null
): string | null {
  if (location === null && pizza === null) {
    return 'Select a location and complete a pizza to compare.'
  }

  if (location === null) {
    return 'Select a location to compare.'
  }

  if (pizza === null) {
    return 'Complete a pizza to compare.'
  }

  return null
}
