import type { PizzaConfiguration } from '@pizzawise/shared'
import { optionLabel, type Translate } from '../../i18n'

const BASE_SEPARATOR = ' · '

export function favoriteBaseSummary (
  configuration: PizzaConfiguration,
  t: Translate
): string {
  return [
    optionLabel(t, configuration.sizeTag),
    optionLabel(t, configuration.crustTag),
    optionLabel(t, configuration.sauceTag)
  ].join(BASE_SEPARATOR)
}

export function favoriteToppingsSummary (
  configuration: PizzaConfiguration,
  t: Translate
): string | null {
  if (configuration.toppingTags.length === 0) {
    return null
  }

  return configuration.toppingTags.map((tag) => optionLabel(t, tag)).join(BASE_SEPARATOR)
}

export function FavoritePizzaSummary({
  configuration,
  t
}: {
  readonly configuration: PizzaConfiguration
  readonly t: Translate
}) {
  const toppings = favoriteToppingsSummary(configuration, t)

  return (
    <div className="favorite-config">
      <p>{favoriteBaseSummary(configuration, t)}</p>
      {toppings !== null && <p>{toppings}</p>}
    </div>
  )
}
