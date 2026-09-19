import type {
  DesiredOptionTag,
  MatchedNearbyPizza,
  MatchedPizzaSelection,
  Menu,
  Money,
  NearbyPizzeriaMenuResult,
  PizzaConfiguration,
  SemanticTag
} from '@pizzawise/shared'

export function matchNearbyPizzeriaPizzas (
  configuration: PizzaConfiguration,
  menus: readonly NearbyPizzeriaMenuResult[]
): MatchedNearbyPizza[] {
  assertUniqueToppingTags(configuration.toppingTags)

  const matches: MatchedNearbyPizza[] = []

  for (const result of menus) {
    if (result.status === 'unavailable') {
      continue
    }

    const priced = matchAndPriceMenu(configuration, result.menu)
    if (priced === null) {
      continue
    }

    matches.push({
      nearby: result.nearby,
      selection: priced.selection,
      total: priced.total
    })
  }

  return matches
}

export function matchAndPriceMenu (
  configuration: PizzaConfiguration,
  menu: Menu
): { selection: MatchedPizzaSelection, total: Money } | null {
  const selection = matchPizzaSelection(configuration, menu)
  if (selection === null) {
    return null
  }

  const total = priceSelection(menu.currency, selection)
  if (total === null) {
    return null
  }

  return { selection, total }
}

function assertUniqueToppingTags (
  toppingTags: readonly DesiredOptionTag[]
): void {
  const seenTags = new Set<DesiredOptionTag>()

  for (const tag of toppingTags) {
    if (seenTags.has(tag)) {
      throw new RangeError('Pizza configuration topping tags must be unique')
    }

    seenTags.add(tag)
  }
}

function matchPizzaSelection (
  configuration: PizzaConfiguration,
  menu: Menu
): MatchedPizzaSelection | null {
  const size = findFirstByTag(menu.sizes, configuration.sizeTag)
  const crust = findFirstByTag(menu.crusts, configuration.crustTag)
  const sauce = findFirstByTag(menu.sauces, configuration.sauceTag)

  if (size === undefined || crust === undefined || sauce === undefined) {
    return null
  }

  const toppings = []
  for (const tag of configuration.toppingTags) {
    const topping = findFirstByTag(menu.toppings, tag)
    if (topping === undefined) {
      return null
    }

    toppings.push(topping)
  }

  return {
    size,
    crust,
    sauce,
    toppings
  }
}

function priceSelection (
  currency: string,
  selection: MatchedPizzaSelection
): Money | null {
  const pricedOptions = [selection.size, selection.crust, ...selection.toppings]

  let amountMinor = 0
  for (const option of pricedOptions) {
    // Defensive integrity check only: never convert or mix currencies.
    if (
      option.price.currency !== currency ||
      !Number.isSafeInteger(option.price.amountMinor)
    ) {
      return null
    }

    amountMinor += option.price.amountMinor
    if (!Number.isSafeInteger(amountMinor)) {
      return null
    }
  }

  return {
    amountMinor,
    currency
  }
}

function findFirstByTag<T extends { readonly semanticTag: SemanticTag }> (
  options: readonly T[],
  tag: DesiredOptionTag
): T | undefined {
  return options.find((option) => option.semanticTag === tag)
}
