import {
  createEtaRange,
  type ComparisonPriority,
  type EtaRange,
  type MatchedNearbyPizza,
  type MatchedPizzaSelection,
  type NearbyPizzeria,
  type Pizzeria
} from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { compareNearbyPizzas } from '../../../src/domain/comparison/index.js'

const SELECTION: MatchedPizzaSelection = {
  size: {
    providerId: 'sz',
    providerName: 'Large',
    semanticTag: 'large',
    price: { amountMinor: 1000, currency: 'ILS' }
  },
  crust: {
    providerId: 'cr',
    providerName: 'Thin',
    semanticTag: 'thin',
    price: { amountMinor: 0, currency: 'ILS' }
  },
  sauce: {
    providerName: 'tomato',
    semanticTag: 'tomato'
  },
  toppings: []
}

describe('compareNearbyPizzas', () => {
  test('ranks every matched pizza and returns an empty ranking for no matches', () => {
    assert.deepEqual(compareNearbyPizzas([]), {
      ranked: [],
      uncheckedPizzeriaCount: 0
    })
  })

  test('gives a single available pizza rank 1 and zero costs', () => {
    const available = availablePizza({
      id: 'p2',
      distanceKm: 1.2,
      amountMinor: 2500,
      eta: eta(40, 50)
    })

    const comparison = compareNearbyPizzas([available])

    assert.equal(comparison.ranked.length, 1)
    assert.equal(comparison.ranked[0]?.rank, 1)
    assert.equal(comparison.ranked[0]?.score, 0)
    assert.deepEqual(comparison.ranked[0]?.costs, {
      price: 0,
      distance: 0,
      eta: 0
    })
  })

  test('normalizes each criterion so the best value is 0 and the worst is 1', () => {
    const cheapestClosestFastest = availablePizza({
      id: 'p-best',
      distanceKm: 1,
      amountMinor: 1000,
      eta: eta(10)
    })
    const costliestFarthestSlowest = availablePizza({
      id: 'p-worst',
      distanceKm: 5,
      amountMinor: 2000,
      eta: eta(30)
    })

    const comparison = compareNearbyPizzas(
      [costliestFarthestSlowest, cheapestClosestFastest],
      'price'
    )

    const best = comparison.ranked.find(
      (pizza) => pizza.nearby.pizzeria.id === 'p-best'
    )
    const worst = comparison.ranked.find(
      (pizza) => pizza.nearby.pizzeria.id === 'p-worst'
    )

    assert.deepEqual(best?.costs, { price: 0, distance: 0, eta: 0 })
    assert.deepEqual(worst?.costs, { price: 1, distance: 1, eta: 1 })
  })

  test('treats an equal criterion as a zero cost for every candidate', () => {
    const first = availablePizza({
      id: 'p1',
      distanceKm: 1,
      amountMinor: 1000,
      eta: eta(10)
    })
    const second = availablePizza({
      id: 'p2',
      distanceKm: 5,
      amountMinor: 1000,
      eta: eta(30)
    })

    const comparison = compareNearbyPizzas([second, first], 'distance')

    assert.equal(comparison.ranked[0]?.costs.price, 0)
    assert.equal(comparison.ranked[1]?.costs.price, 0)
    assert.equal(comparison.ranked[0]?.nearby.pizzeria.id, 'p1')
  })

  test('uses default 0.40/0.35/0.25 weights when priority is omitted', () => {
    const bestPrice = availablePizza({
      id: 'price-best',
      distanceKm: 5,
      amountMinor: 1000,
      eta: eta(40)
    })
    const bestOthers = availablePizza({
      id: 'others-best',
      distanceKm: 1,
      amountMinor: 2000,
      eta: eta(10)
    })

    const omitted = compareNearbyPizzas([bestPrice, bestOthers])
    const explicitDefault = compareNearbyPizzas(
      [bestPrice, bestOthers],
      undefined
    )

    assert.deepEqual(
      omitted.ranked.map((pizza) => pizza.nearby.pizzeria.id),
      ['others-best', 'price-best']
    )
    assert.deepEqual(
      explicitDefault.ranked.map((pizza) => pizza.nearby.pizzeria.id),
      omitted.ranked.map((pizza) => pizza.nearby.pizzeria.id)
    )
    assert.equal(omitted.ranked[0]?.score, 0.4)
    assert.equal(omitted.ranked[1]?.score, 0.6)
  })

  test('uses 0.60/0.20/0.20 weights when price is selected', () => {
    const comparison = compareNearbyPizzas(dominancePair(), 'price')

    assert.deepEqual(
      comparison.ranked.map((pizza) => pizza.nearby.pizzeria.id),
      ['price-best', 'others-best']
    )
    assert.equal(comparison.ranked[0]?.score, 0.4)
    assert.equal(comparison.ranked[1]?.score, 0.6)
  })

  test('uses 0.60/0.20/0.20 weights when distance is selected', () => {
    const comparison = compareNearbyPizzas(dominancePair(), 'distance')

    assert.deepEqual(
      comparison.ranked.map((pizza) => pizza.nearby.pizzeria.id),
      ['others-best', 'price-best']
    )
    assert.equal(comparison.ranked[0]?.score, 0.2)
    assert.equal(comparison.ranked[1]?.score, 0.8)
  })

  test('uses 0.60/0.20/0.20 weights when eta is selected', () => {
    const comparison = compareNearbyPizzas(dominancePair(), 'eta')

    assert.deepEqual(
      comparison.ranked.map((pizza) => pizza.nearby.pizzeria.id),
      ['others-best', 'price-best']
    )
    assert.equal(comparison.ranked[0]?.score, 0.2)
    assert.equal(comparison.ranked[1]?.score, 0.8)
  })

  test('lets secondary criteria break a close primary race', () => {
    const slightlyCheaperFar = availablePizza({
      id: 'cheap-far',
      distanceKm: 5,
      amountMinor: 1000,
      eta: eta(40)
    })
    const slightlyCostlierClose = availablePizza({
      id: 'costly-close',
      distanceKm: 1,
      amountMinor: 1100,
      eta: eta(10)
    })
    const expensiveAnchor = availablePizza({
      id: 'anchor',
      distanceKm: 3,
      amountMinor: 2000,
      eta: eta(25)
    })

    const comparison = compareNearbyPizzas(
      [slightlyCheaperFar, slightlyCostlierClose, expensiveAnchor],
      'price'
    )

    assert.equal(comparison.ranked[0]?.nearby.pizzeria.id, 'costly-close')
  })

  test('uses the midpoint of an ETA range', () => {
    const comparison = compareNearbyPizzas([
      availablePizza({
        id: 'range',
        distanceKm: 1,
        amountMinor: 1000,
        eta: eta(40, 50)
      }),
      availablePizza({
        id: 'point',
        distanceKm: 1,
        amountMinor: 1000,
        eta: eta(20)
      })
    ])

    const range = comparison.ranked.find(
      (pizza) => pizza.nearby.pizzeria.id === 'range'
    )
    const point = comparison.ranked.find(
      (pizza) => pizza.nearby.pizzeria.id === 'point'
    )

    assert.equal(point?.costs.eta, 0)
    assert.equal(range?.costs.eta, 1)
    assert.deepEqual(range?.nearby.pizzeria.averageEta, eta(40, 50))
    assert.equal(range?.nearby.pizzeria.averageEta?.minutes, 45)
  })

  test('assigns null ETA a cost of 1 when any known ETA exists', () => {
    const known = availablePizza({
      id: 'known',
      distanceKm: 1,
      amountMinor: 1000,
      eta: eta(20)
    })
    const missing = availablePizza({
      id: 'missing',
      distanceKm: 1,
      amountMinor: 1000,
      eta: null
    })

    const comparison = compareNearbyPizzas([missing, known], 'eta')

    assert.equal(
      comparison.ranked.find((pizza) => pizza.nearby.pizzeria.id === 'known')
        ?.costs.eta,
      0
    )
    assert.equal(
      comparison.ranked.find((pizza) => pizza.nearby.pizzeria.id === 'missing')
        ?.costs.eta,
      1
    )
    assert.equal(comparison.ranked[0]?.nearby.pizzeria.id, 'known')
  })

  test('assigns all-null ETA a cost of 0', () => {
    const comparison = compareNearbyPizzas([
      availablePizza({
        id: 'p2',
        distanceKm: 1,
        amountMinor: 1000,
        eta: null
      }),
      availablePizza({
        id: 'p10',
        distanceKm: 2,
        amountMinor: 2000,
        eta: null
      })
    ])

    assert.equal(comparison.ranked[0]?.costs.eta, 0)
    assert.equal(comparison.ranked[1]?.costs.eta, 0)
  })

  test('tie-breaks by selected criterion then pizzeria ID when scores match', () => {
    const comparison = compareNearbyPizzas(
      [
        availablePizza({
          id: 'p2',
          distanceKm: 1,
          amountMinor: 1000,
          eta: eta(20)
        }),
        availablePizza({
          id: 'p1',
          distanceKm: 1,
          amountMinor: 1000,
          eta: eta(20)
        })
      ],
      'distance'
    )

    assert.deepEqual(
      comparison.ranked.map((pizza) => pizza.nearby.pizzeria.id),
      ['p1', 'p2']
    )
  })

  test('tie-breaks without priority by known ETA before null, then ID', () => {
    const comparison = compareNearbyPizzas([
      availablePizza({
        id: 'p-null',
        distanceKm: 2,
        amountMinor: 2000,
        eta: null
      }),
      availablePizza({
        id: 'p-slow',
        distanceKm: 2,
        amountMinor: 2000,
        eta: eta(40)
      }),
      availablePizza({
        id: 'p-fast',
        distanceKm: 1,
        amountMinor: 1000,
        eta: eta(10)
      })
    ])

    const slowAndNull = comparison.ranked.filter(
      (pizza) => pizza.costs.eta === 1
    )
    assert.deepEqual(
      slowAndNull.map((pizza) => pizza.nearby.pizzeria.id),
      ['p-slow', 'p-null']
    )

    const identical = compareNearbyPizzas([
      availablePizza({
        id: 'p2',
        distanceKm: 1,
        amountMinor: 1000,
        eta: eta(20)
      }),
      availablePizza({
        id: 'p1',
        distanceKm: 1,
        amountMinor: 1000,
        eta: eta(20)
      })
    ])

    assert.deepEqual(
      identical.ranked.map((pizza) => pizza.nearby.pizzeria.id),
      ['p1', 'p2']
    )
  })

  test('ranks independently of input order', () => {
    const pair = dominancePair()
    const reversed = [...pair].reverse()

    assert.deepEqual(
      compareNearbyPizzas(pair, 'price').ranked.map(
        (pizza) => pizza.nearby.pizzeria.id
      ),
      compareNearbyPizzas(reversed, 'price').ranked.map(
        (pizza) => pizza.nearby.pizzeria.id
      )
    )
  })

  test('rejects mixed available currencies', () => {
    assert.throws(
      () =>
        compareNearbyPizzas([
          availablePizza({
            id: 'p1',
            distanceKm: 1,
            amountMinor: 1000,
            eta: eta(20)
          }),
          availablePizza({
            id: 'p2',
            distanceKm: 1,
            amountMinor: 1000,
            eta: eta(20),
            currency: 'inconsistent'
          })
        ]),
      RangeError
    )
  })

  test('rejects an invalid comparison priority', () => {
    assert.throws(
      () =>
        compareNearbyPizzas(
          [],
          'popularity' as ComparisonPriority
        ),
      RangeError
    )
  })
})

function dominancePair (): MatchedNearbyPizza[] {
  return [
    availablePizza({
      id: 'price-best',
      distanceKm: 5,
      amountMinor: 1000,
      eta: eta(40)
    }),
    availablePizza({
      id: 'others-best',
      distanceKm: 1,
      amountMinor: 2000,
      eta: eta(10)
    })
  ]
}

function availablePizza (options: {
  id: string
  distanceKm: number
  amountMinor: number
  eta: EtaRange | null
  currency?: string
}): MatchedNearbyPizza {
  const currency = options.currency ?? 'ILS'

  return {
    nearby: nearbyPizzeria(options.id, options.distanceKm, options.eta),
    selection: SELECTION,
    total: {
      amountMinor: options.amountMinor,
      currency
    }
  }
}

function nearbyPizzeria (
  id: string,
  distanceKm: number,
  averageEta: EtaRange | null
): NearbyPizzeria {
  const pizzeria: Pizzeria = {
    id,
    name: id,
    latitude: 32.08,
    longitude: 34.78,
    averageEta
  }

  return { pizzeria, distanceKm }
}

function eta (minMinutes: number, maxMinutes = minMinutes): EtaRange {
  return createEtaRange(minMinutes, maxMinutes)
}
