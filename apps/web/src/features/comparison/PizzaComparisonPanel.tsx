import type {
  ComparisonPriority,
  PizzaConfiguration,
  PublicUser,
  RankedPizza,
  UserLocation
} from '@pizzawise/shared'
import { useState } from 'react'
import { useTranslate, type MessageKey } from '../../i18n'
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

const RANKING_OPTIONS: readonly {
  readonly value: RankingChoice
  readonly labelKey: MessageKey
}[] = [
  { value: 'balanced', labelKey: 'compare.balanced' },
  { value: 'price', labelKey: 'compare.price' },
  { value: 'distance', labelKey: 'compare.distance' },
  { value: 'eta', labelKey: 'compare.eta' }
]

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
  const t = useTranslate()
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
  const missingMessage = missingRequirementsMessage(location, pizza, t)

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
        message: t('compare.failed')
      })
    } finally {
      setIsLoading(false)
    }
  }

  const successOutcome =
    currentOutcome?.kind === 'success' ? currentOutcome : null
  const hasRankedResults =
    successOutcome !== null && successOutcome.ranked.length > 0
  const incompleteEmpty =
    successOutcome !== null &&
    successOutcome.ranked.length === 0 &&
    successOutcome.uncheckedPizzeriaCount > 0
  const emptyMatches =
    successOutcome !== null &&
    successOutcome.ranked.length === 0 &&
    successOutcome.uncheckedPizzeriaCount === 0

  return (
    <section className="pizza-comparison" aria-labelledby="comparison-heading">
      <h2 id="comparison-heading">{t('compare.heading')}</h2>

      <fieldset className="builder-options option-pills ranking-toggle">
        <legend>{t('compare.priorityLegend')}</legend>
        <ul>
          {RANKING_OPTIONS.map(({ value, labelKey }) => (
            <li key={value}>
              <label className={ranking === value ? 'is-selected' : undefined}>
                <input
                  type="radio"
                  name="comparison-priority"
                  value={value}
                  checked={ranking === value}
                  onChange={() => setRanking(value)}
                />
                {t(labelKey)}
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
          {isLoading ? t('compare.comparing') : t('compare.button')}
        </button>
      </div>

      {missingMessage !== null && !isLoading && currentOutcome === null && (
        <div className="comparison-status" aria-live="polite">
          <p>{missingMessage}</p>
        </div>
      )}

      <div
        className="comparison-results-area"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading && (
          <div className="comparison-state is-loading">
            <p>{t('compare.comparingNearby')}</p>
          </div>
        )}

        {!isLoading && currentOutcome?.kind === 'error' && (
          <div className="comparison-state is-error" role="alert">
            <p>{currentOutcome.message}</p>
            <button
              type="button"
              className="button-primary"
              onClick={() => void handleCompare()}
            >
              {t('compare.retry')}
            </button>
          </div>
        )}

        {!isLoading && incompleteEmpty && (
          <div className="comparison-state is-incomplete">
            <p>{t('compare.incomplete')}</p>
            <button
              type="button"
              className="button-primary"
              onClick={() => void handleCompare()}
            >
              {t('compare.retry')}
            </button>
          </div>
        )}

        {!isLoading && emptyMatches && (
          <div className="comparison-state is-empty">
            <p>{t('compare.empty')}</p>
          </div>
        )}

        {!isLoading && hasRankedResults && successOutcome !== null && (
          <>
            {successOutcome.uncheckedPizzeriaCount > 0 && (
              <p className="comparison-warning">
                {t('compare.partialWarning')}
              </p>
            )}
            <ol className="comparison-results" aria-label={t('compare.rankedAria')}>
              {successOutcome.ranked.map((pizzaResult) => (
                <li
                  className={
                    pizzaResult.rank === 1
                      ? 'surface-card comparison-result is-top-match'
                      : 'surface-card comparison-result'
                  }
                  key={`${pizzaResult.rank}-${pizzaResult.nearby.pizzeria.id}`}
                >
                  {pizzaResult.rank === 1 && (
                    <p className="result-badge">{t('compare.topMatch')}</p>
                  )}
                  <p className="result-rank">#{pizzaResult.rank}</p>
                  <h3>
                    {pizzaResult.rank}. {pizzaResult.nearby.pizzeria.name}
                  </h3>
                  <dl>
                    <div>
                      <dt>{t('compare.priceLabel')}</dt>
                      <dd>{formatPrice(pizzaResult.total, t)}</dd>
                    </div>
                    <div>
                      <dt>{t('compare.distanceLabel')}</dt>
                      <dd>
                        {formatDistanceKm(pizzaResult.nearby.distanceKm, t)}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('compare.etaLabel')}</dt>
                      <dd>
                        {formatEta(pizzaResult.nearby.pizzeria.averageEta, t)}
                      </dd>
                    </div>
                  </dl>
                  {user === null ? (
                    <p>{t('compare.signInToOrder')}</p>
                  ) : (
                    <div className="builder-actions">
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() =>
                          onChoosePizzeria?.(pizzaResult.nearby.pizzeria.id)
                        }
                      >
                        {t('compare.orderFrom', {
                          name: pizzaResult.nearby.pizzeria.name
                        })}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  )
}

function missingRequirementsMessage (
  location: UserLocation | null,
  pizza: PizzaConfiguration | null,
  t: ReturnType<typeof useTranslate>
): string | null {
  if (location === null && pizza === null) {
    return t('compare.needBoth')
  }

  if (location === null) {
    return t('compare.needLocation')
  }

  if (pizza === null) {
    return t('compare.needPizza')
  }

  return null
}
