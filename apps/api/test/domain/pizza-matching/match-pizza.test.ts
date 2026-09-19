import type {
  Crust,
  Menu,
  NearbyPizzeria,
  NearbyPizzeriaMenuResult,
  PizzaConfiguration,
  PizzaSize,
  Pizzeria,
  Sauce,
  SemanticTag,
  Topping
} from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { matchNearbyPizzeriaPizzas } from '../../../src/domain/pizza-matching/index.js'

const CONFIGURATION: PizzaConfiguration = {
  sizeTag: 'large',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['mushroom', 'olives']
}

describe('matchNearbyPizzeriaPizzas', () => {
  test('ignores Step 16 unavailable menu results', () => {
    const unavailable = unavailableMenuResult('p89', 0.8)
    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [unavailable])

    assert.deepEqual(results, [])
  })

  test('matches and prices a complete pizza from canonical options', () => {
    const menuResult = availableMenuResult('p2', 0.5)
    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [menuResult])
    const menu = menuResult.menu

    assert.deepEqual(results, [
      {
        nearby: menuResult.nearby,
        selection: {
          size: menu.sizes[1],
          crust: menu.crusts[0],
          sauce: menu.sauces[1],
          toppings: [menu.toppings[1], menu.toppings[2]]
        },
        total: {
          amountMinor: 1750,
          currency: 'ILS'
        }
      }
    ])
  })

  test('allows a pizza with no requested toppings', () => {
    const menuResult = availableMenuResult('p2', 0.5)
    const results = matchNearbyPizzeriaPizzas(
      {
        ...CONFIGURATION,
        toppingTags: []
      },
      [menuResult]
    )

    assert.equal(results.length, 1)
    assert.deepEqual(results[0]?.selection.toppings, [])
    assert.deepEqual(results[0]?.total, {
      amountMinor: 1500,
      currency: 'ILS'
    })
  })

  test('does not match a null semantic tag', () => {
    const menuResult = availableMenuResult('p2', 0.5, {
      sizes: [
        pricedSize('sz-one', 'One Size', null, 1000),
        pricedSize('sz-l', 'Large', 'large', 1000)
      ]
    })

    const results = matchNearbyPizzeriaPizzas(
      {
        ...CONFIGURATION,
        sizeTag: 'small'
      },
      [menuResult]
    )

    assert.deepEqual(results, [])
  })

  test('does not match provider names or IDs', () => {
    const menuResult = availableMenuResult('p2', 0.5, {
      sizes: [pricedSize('large', 'large', 'medium', 1000)]
    })

    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [menuResult])

    assert.deepEqual(results, [])
  })

  test('omits menus that cannot fully match size, crust, sauce, or toppings', () => {
    const complete = availableMenuResult('p2', 0.5)

    const missingSize = availableMenuResult('p10', 0.6, { sizes: [] })
    const missingCrust = availableMenuResult('p18', 1.1, { crusts: [] })
    const missingSauce = availableMenuResult('p1', 1.5, { sauces: [] })
    const missingTopping = availableMenuResult('p4', 1.9, {
      toppings: [pricedTopping('tp-olives', 'Olives', 'olives', 100)]
    })

    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [
      complete,
      missingSize,
      missingCrust,
      missingSauce,
      missingTopping
    ])

    assert.deepEqual(
      results.map((result) => result.nearby.pizzeria.id),
      ['p2']
    )
  })

  test('selects the first matching option in menu order, not the cheaper one', () => {
    const cheaperLarge = pricedSize('sz-l-cheap', 'L', 'large', 800)
    const firstLarge = pricedSize('sz-l-first', 'Large', 'large', 1200)
    const menuResult = availableMenuResult('p2', 0.5, {
      sizes: [firstLarge, cheaperLarge]
    })

    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [menuResult])

    assert.equal(results.length, 1)
    assert.equal(results[0]?.selection.size.providerId, 'sz-l-first')
    assert.equal(results[0]?.total.amountMinor, 1950)
  })

  test('omits internally inconsistent option currencies', () => {
    const menuResult = availableMenuResult('p2', 0.5, {
      toppings: [
        pricedTopping('tp-mushroom', 'mushroom', 'mushroom', 150, 'inconsistent'),
        pricedTopping('tp-olives', 'Olives', 'olives', 100)
      ]
    })

    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [menuResult])

    assert.deepEqual(results, [])
  })

  test('preserves the order of successful matches and skips the rest', () => {
    const first = availableMenuResult('p2', 0.5)
    const second = unavailableMenuResult('p10', 0.6)
    const third = availableMenuResult('p89', 0.8, { sauces: [] })
    const fourth = availableMenuResult('p1', 1.5)

    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [
      first,
      second,
      third,
      fourth
    ])

    assert.deepEqual(
      results.map((result) => result.nearby.pizzeria.id),
      ['p2', 'p1']
    )
  })

  test('copies the menu currency onto the integer total', () => {
    const menuResult = availableMenuResult('p2', 0.5)
    const results = matchNearbyPizzeriaPizzas(CONFIGURATION, [menuResult])

    assert.equal(results[0]?.total.amountMinor, 1000 + 500 + 150 + 100)
    assert.equal(results[0]?.total.currency, 'ILS')
  })

  test('throws before processing results when topping tags are duplicated', () => {
    let processed = false
    const menus: NearbyPizzeriaMenuResult[] = [
      {
        get nearby () {
          processed = true
          return nearbyPizzeria('p2', 0.5)
        },
        status: 'unavailable'
      }
    ]

    assert.throws(
      () =>
        matchNearbyPizzeriaPizzas(
          {
            ...CONFIGURATION,
            toppingTags: ['mushroom', 'olives', 'mushroom']
          },
          menus
        ),
      RangeError
    )
    assert.equal(processed, false)
  })
})

function nearbyPizzeria (id: string, distanceKm: number): NearbyPizzeria {
  const pizzeria: Pizzeria = {
    id,
    name: id,
    latitude: 32.08,
    longitude: 34.78,
    averageEta: null
  }

  return { pizzeria, distanceKm }
}

function unavailableMenuResult (
  id: string,
  distanceKm: number
): NearbyPizzeriaMenuResult {
  return {
    nearby: nearbyPizzeria(id, distanceKm),
    status: 'unavailable'
  }
}

function availableMenuResult (
  id: string,
  distanceKm: number,
  overrides: Partial<Menu> = {}
): NearbyPizzeriaMenuResult & { status: 'available', menu: Menu } {
  return {
    nearby: nearbyPizzeria(id, distanceKm),
    status: 'available',
    menu: {
      pizzeriaId: id,
      currency: 'ILS',
      sizes: [
        pricedSize('sz-m', 'Medium', 'medium', 800),
        pricedSize('sz-l', 'Large', 'large', 1000)
      ],
      crusts: [pricedCrust('cr-thin', 'Thin', 'thin', 500)],
      sauces: [
        sauce('white', 'white'),
        sauce('tomato', 'tomato')
      ],
      toppings: [
        pricedTopping('tp-pepperoni', 'pepperoni', 'pepperoni', 200),
        pricedTopping('tp-mushroom', 'mushroom', 'mushroom', 150),
        pricedTopping('tp-olives', 'Olives', 'olives', 100)
      ],
      ...overrides
    }
  }
}

function pricedSize (
  providerId: string,
  providerName: string,
  semanticTag: SemanticTag,
  amountMinor: number,
  currency = 'ILS'
): PizzaSize {
  return {
    providerId,
    providerName,
    semanticTag,
    price: { amountMinor, currency }
  }
}

function pricedCrust (
  providerId: string,
  providerName: string,
  semanticTag: SemanticTag,
  amountMinor: number,
  currency = 'ILS'
): Crust {
  return {
    providerId,
    providerName,
    semanticTag,
    price: { amountMinor, currency }
  }
}

function pricedTopping (
  providerId: string,
  providerName: string,
  semanticTag: SemanticTag,
  amountMinor: number,
  currency = 'ILS'
): Topping {
  return {
    providerId,
    providerName,
    semanticTag,
    price: { amountMinor, currency }
  }
}

function sauce (providerName: string, semanticTag: SemanticTag): Sauce {
  return {
    providerName,
    semanticTag
  }
}
