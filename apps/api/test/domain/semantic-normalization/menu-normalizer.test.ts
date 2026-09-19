import type { Menu, PricedProviderOption } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { normalizeMenuSemanticTags } from '../../../src/domain/semantic-normalization/index.js'

const SIZE_CASES = [
  ['Small', 'small'],
  ['S', 'small'],
  ['Personal', 'small'],
  ['Single', 'small'],
  ['Piccola', 'small'],
  ['Medium', 'medium'],
  ['M', 'medium'],
  ['Regular', 'medium'],
  ['Large', 'large'],
  ['L', 'large'],
  ['Grande', 'large'],
  ['Big', 'large'],
  ['XL', 'extra-large'],
  ['Family', 'extra-large'],
  ['Tray', 'extra-large']
] as const

const AMBIGUOUS_SIZES = [
  'One Size'
] as const

const CRUST_CASES = [
  ['Cheese Burst', 'cheese-burst'],
  ['Classic', 'classic'],
  ['Deep Dish', 'deep-dish'],
  ['Gluten Free', 'gluten-free'],
  ['Homestyle', 'homestyle'],
  ['Neapolitan', 'neapolitan'],
  ['Pan', 'pan'],
  ['Sourdough', 'sourdough'],
  ['Stuffed', 'stuffed'],
  ['Thin', 'thin'],
  ['Thin & Crispy', 'thin-crispy'],
  ['Whole Wheat', 'whole-wheat'],
  ['Wood Fired', 'wood-fired']
] as const

const SAUCE_CASES = [
  ['bbq', 'bbq'],
  ['garlic cream', 'garlic-cream'],
  ['harissa', 'harissa'],
  ['pesto', 'pesto'],
  ['san marzano', 'san-marzano'],
  ['tomato', 'tomato'],
  ['white', 'white']
] as const

const TOPPING_CASES = [
  ['anchovy', 'anchovy'],
  ['artichoke', 'artichoke'],
  ['arugula', 'arugula'],
  ['basil', 'basil'],
  ['bell pepper', 'bell-pepper'],
  ['black olives', 'black-olives'],
  ['buffalo mozzarella', 'buffalo-mozzarella'],
  ['bulgarian cheese', 'bulgarian-cheese'],
  ['caramelized onion', 'caramelized-onion'],
  ['champignon', 'champignon'],
  ['cherry tomato', 'cherry-tomato'],
  ['corn', 'corn'],
  ['Double Cheese', 'double-cheese'],
  ['egg', 'egg'],
  ['extra cheese', 'extra-cheese'],
  ['extra_cheese', 'extra-cheese'],
  ['feta', 'feta'],
  ['funghi', 'funghi'],
  ['green olives', 'green-olives'],
  ['Olives (green)', 'green-olives'],
  ['hot pepper', 'hot-pepper'],
  ['jalapeño', 'jalapeno'],
  ['labneh', 'labneh'],
  ['mushroom', 'mushroom'],
  ['MUSHROOMS', 'mushroom'],
  ['Olives', 'olives'],
  ['onion', 'onion'],
  ['onions', 'onion'],
  ['oregano', 'oregano'],
  ['pepperoni', 'pepperoni'],
  ['pesto drizzle', 'pesto-drizzle'],
  ['pineapple', 'pineapple'],
  ['porcini mushroom', 'porcini-mushroom'],
  ['prosciutto', 'prosciutto'],
  ['red onion', 'red-onion'],
  ['smoked mozzarella', 'smoked-mozzarella'],
  ['sun-dried tomato', 'sun-dried-tomato'],
  ['sweet corn', 'sweet-corn'],
  ['truffle oil', 'truffle-oil'],
  ['TUNA', 'tuna'],
  ["za'atar", 'zaatar']
] as const

describe('normalizeMenuSemanticTags', () => {
  test('assigns only the approved size tags', () => {
    const sizes = [
      ...SIZE_CASES.map(([name]) => pricedOption(name)),
      ...AMBIGUOUS_SIZES.map((name) => pricedOption(name))
    ]
    const result = normalizeMenuSemanticTags(menu({ sizes }))

    assert.deepEqual(
      result.sizes.map(({ providerName, semanticTag }) => [
        providerName,
        semanticTag
      ]),
      [
        ...SIZE_CASES,
        ...AMBIGUOUS_SIZES.map((name) => [name, null])
      ]
    )
  })

  test('assigns the approved crust tags', () => {
    const result = normalizeMenuSemanticTags(
      menu({ crusts: CRUST_CASES.map(([name]) => pricedOption(name)) })
    )

    assert.deepEqual(
      result.crusts.map(({ providerName, semanticTag }) => [
        providerName,
        semanticTag
      ]),
      CRUST_CASES
    )
  })

  test('assigns the approved sauce tags', () => {
    const result = normalizeMenuSemanticTags(
      menu({
        sauces: SAUCE_CASES.map(([providerName]) => ({
          providerName,
          semanticTag: null
        }))
      })
    )

    assert.deepEqual(
      result.sauces.map(({ providerName, semanticTag }) => [
        providerName,
        semanticTag
      ]),
      SAUCE_CASES
    )
  })

  test('assigns conservative topping tags without collapsing variants', () => {
    const result = normalizeMenuSemanticTags(
      menu({
        toppings: TOPPING_CASES.map(([name]) => pricedOption(name))
      })
    )

    assert.deepEqual(
      result.toppings.map(({ providerName, semanticTag }) => [
        providerName,
        semanticTag
      ]),
      TOPPING_CASES
    )

    assert.notEqual(tagFor(result, 'mushroom'), tagFor(result, 'funghi'))
    assert.notEqual(tagFor(result, 'mushroom'), tagFor(result, 'champignon'))
    assert.notEqual(
      tagFor(result, 'mushroom'),
      tagFor(result, 'porcini mushroom')
    )
  })

  test('does not trim, change case generically, slug, or fuzzy match', () => {
    const result = normalizeMenuSemanticTags(
      menu({
        sizes: [pricedOption('small')],
        crusts: [pricedOption('thin')],
        sauces: [
          { providerName: ' tomato ', semanticTag: null },
          { providerName: 'BBQ', semanticTag: null },
          { providerName: 'Tomato', semanticTag: null }
        ],
        toppings: [
          pricedOption('mushrom'),
          pricedOption('Funghi'),
          pricedOption('Mushrooms'),
          pricedOption('Onions'),
          pricedOption('Pineapple')
        ]
      })
    )

    assert.equal(result.sizes[0]?.semanticTag, null)
    assert.equal(result.crusts[0]?.semanticTag, null)
    assert.ok(result.sauces.every((sauce) => sauce.semanticTag === null))
    assert.ok(
      result.toppings.every((topping) => topping.semanticTag === null)
    )
  })

  test('preserves source data and ordering without mutating the input', () => {
    const input = menu({
      sizes: [
        pricedOption('S', 'size-2', 3390),
        pricedOption('Unknown Size', 'size-1', 4100)
      ],
      sauces: [
        { providerName: 'Tomato', semanticTag: null },
        { providerName: 'unknown sauce', semanticTag: null }
      ]
    })
    const snapshot = structuredClone(input)

    const result = normalizeMenuSemanticTags(input)

    assert.deepEqual(input, snapshot)
    assert.notStrictEqual(result, input)
    assert.deepEqual(
      result.sizes.map(({ providerId, providerName, price }) => ({
        providerId,
        providerName,
        price
      })),
      input.sizes.map(({ providerId, providerName, price }) => ({
        providerId,
        providerName,
        price
      }))
    )
    assert.deepEqual(
      result.sauces.map(({ providerName }) => providerName),
      ['Tomato', 'unknown sauce']
    )
    assert.equal(result.pizzeriaId, input.pizzeriaId)
    assert.equal(result.currency, input.currency)
  })
})

function pricedOption (
  providerName: string,
  providerId = providerName,
  amountMinor = 100
): PricedProviderOption {
  return {
    providerId,
    providerName,
    semanticTag: null,
    price: {
      amountMinor,
      currency: 'ILS'
    }
  }
}

function menu (overrides: Partial<Menu> = {}): Menu {
  return {
    pizzeriaId: 'p1',
    currency: 'ILS',
    sizes: [],
    crusts: [],
    sauces: [],
    toppings: [],
    ...overrides
  }
}

function tagFor (menu: Menu, providerName: string): string | null | undefined {
  return menu.toppings.find(
    (topping) => topping.providerName === providerName
  )?.semanticTag
}
