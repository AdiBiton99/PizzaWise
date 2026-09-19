import type {
  ComparisonCosts,
  ComparisonPriority,
  EtaRange,
  MatchedNearbyPizza,
  PizzaComparison,
  RankedPizza
} from '@pizzawise/shared'

interface ComparisonWeights {
  readonly price: number
  readonly distance: number
  readonly eta: number
}

interface ScoredPizza {
  readonly pizza: MatchedNearbyPizza
  readonly costs: ComparisonCosts
  readonly score: number
  readonly price: number
  readonly distance: number
  readonly etaMinutes: number | null
}

const PRIORITIES = new Set<ComparisonPriority>(['price', 'distance', 'eta'])

export const DEFAULT_COMPARISON_WEIGHTS: ComparisonWeights = {
  price: 0.4,
  eta: 0.35,
  distance: 0.25
}

const PRIORITY_WEIGHTS: Record<ComparisonPriority, ComparisonWeights> = {
  price: {
    price: 0.6,
    eta: 0.2,
    distance: 0.2
  },
  distance: {
    distance: 0.6,
    price: 0.2,
    eta: 0.2
  },
  eta: {
    eta: 0.6,
    price: 0.2,
    distance: 0.2
  }
}

export function compareNearbyPizzas (
  pizzas: readonly MatchedNearbyPizza[],
  priority?: ComparisonPriority
): PizzaComparison {
  const weights = weightsFor(priority)
  assertConsistentCurrencies(pizzas)

  if (pizzas.length === 0) {
    return {
      ranked: [],
      uncheckedPizzeriaCount: 0
    }
  }

  const scored = scorePizzas(pizzas, weights)
  scored.sort((first, second) => compareScored(first, second, priority))

  const ranked: RankedPizza[] = scored.map((item, index) => ({
    rank: index + 1,
    score: item.score,
    costs: item.costs,
    nearby: item.pizza.nearby,
    selection: item.pizza.selection,
    total: item.pizza.total
  }))

  return {
    ranked,
    uncheckedPizzeriaCount: 0
  }
}

function weightsFor (priority?: ComparisonPriority): ComparisonWeights {
  if (priority === undefined) {
    return DEFAULT_COMPARISON_WEIGHTS
  }

  if (!PRIORITIES.has(priority)) {
    throw new RangeError('Comparison priority is invalid')
  }

  return PRIORITY_WEIGHTS[priority]
}

function assertConsistentCurrencies (
  pizzas: readonly MatchedNearbyPizza[]
): void {
  if (pizzas.length === 0) {
    return
  }

  const currency = pizzas[0]!.total.currency
  for (const pizza of pizzas) {
    if (pizza.total.currency !== currency) {
      throw new RangeError('Available pizza currencies must match')
    }
  }
}

function scorePizzas (
  pizzas: readonly MatchedNearbyPizza[],
  weights: ComparisonWeights
): ScoredPizza[] {
  const prices = pizzas.map((pizza) => pizza.total.amountMinor)
  const distances = pizzas.map((pizza) => pizza.nearby.distanceKm)
  const etaMinutes = pizzas.map((pizza) =>
    representativeEta(pizza.nearby.pizzeria.averageEta)
  )
  const knownEtas = etaMinutes.filter((value) => value !== null)
  const hasKnownEta = knownEtas.length > 0
  const minPrice = minimum(prices)
  const maxPrice = maximum(prices)
  const minDistance = minimum(distances)
  const maxDistance = maximum(distances)
  const minEta = minimum(knownEtas)
  const maxEta = maximum(knownEtas)

  return pizzas.map((pizza, index) => {
    const price = prices[index]!
    const distance = distances[index]!
    const eta = etaMinutes[index]!
    const costs: ComparisonCosts = {
      price: normalizeCost(price, minPrice, maxPrice),
      distance: normalizeCost(distance, minDistance, maxDistance),
      eta: etaCost(eta, minEta, maxEta, hasKnownEta)
    }

    return {
      pizza,
      costs,
      score:
        weights.price * costs.price +
        weights.distance * costs.distance +
        weights.eta * costs.eta,
      price,
      distance,
      etaMinutes: eta
    }
  })
}

function representativeEta (eta: EtaRange | null): number | null {
  if (eta === null) {
    return null
  }

  return (eta.minMinutes + eta.maxMinutes) / 2
}

function etaCost (
  etaMinutes: number | null,
  minEta: number,
  maxEta: number,
  hasKnownEta: boolean
): number {
  if (!hasKnownEta) {
    return 0
  }

  if (etaMinutes === null) {
    return 1
  }

  return normalizeCost(etaMinutes, minEta, maxEta)
}

function normalizeCost (value: number, min: number, max: number): number {
  if (max === min) {
    return 0
  }

  return (value - min) / (max - min)
}

function compareScored (
  first: ScoredPizza,
  second: ScoredPizza,
  priority?: ComparisonPriority
): number {
  const scoreDifference = first.score - second.score
  if (scoreDifference !== 0) {
    return scoreDifference
  }

  if (priority === undefined) {
    const priceDifference = first.price - second.price
    if (priceDifference !== 0) {
      return priceDifference
    }

    const etaDifference = compareEtaMinutes(first.etaMinutes, second.etaMinutes)
    if (etaDifference !== 0) {
      return etaDifference
    }

    const distanceDifference = first.distance - second.distance
    if (distanceDifference !== 0) {
      return distanceDifference
    }
  } else {
    const selectedDifference = compareSelectedCriterion(
      first,
      second,
      priority
    )
    if (selectedDifference !== 0) {
      return selectedDifference
    }
  }

  if (first.pizza.nearby.pizzeria.id < second.pizza.nearby.pizzeria.id) {
    return -1
  }
  if (first.pizza.nearby.pizzeria.id > second.pizza.nearby.pizzeria.id) {
    return 1
  }
  return 0
}

function compareSelectedCriterion (
  first: ScoredPizza,
  second: ScoredPizza,
  priority: ComparisonPriority
): number {
  if (priority === 'price') {
    return first.price - second.price
  }

  if (priority === 'distance') {
    return first.distance - second.distance
  }

  return compareEtaMinutes(first.etaMinutes, second.etaMinutes)
}

function compareEtaMinutes (
  first: number | null,
  second: number | null
): number {
  if (first === null && second === null) {
    return 0
  }
  if (first === null) {
    return 1
  }
  if (second === null) {
    return -1
  }
  return first - second
}

function minimum (values: readonly number[]): number {
  return values.reduce(
    (lowest, value) => (value < lowest ? value : lowest),
    Number.POSITIVE_INFINITY
  )
}

function maximum (values: readonly number[]): number {
  return values.reduce(
    (highest, value) => (value > highest ? value : highest),
    Number.NEGATIVE_INFINITY
  )
}
