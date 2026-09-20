import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  normalizeMenuResponse,
  PizzeriaApiAdapterError
} from '../../../src/integrations/pizzeria-api/index.js'

describe('normalizeMenuResponse', () => {
  test('normalizes a cents-based menu', () => {
    const result = normalizeMenuResponse({
      pizzeriaId: 'p1',
      currency: 'ILS',
      priceUnit: 'cents',
      menu: {
        sizes: [{ id: 's', label: 'Small', priceCents: 3500 }],
        crusts: [{ id: 'thin', label: 'Thin', priceCents: 0 }],
        sauces: ['tomato', 'white'],
        toppings: [{ id: 't1', name: 'mushroom', priceCents: 400 }]
      }
    })

    assert.deepEqual(result, {
      pizzeriaId: 'p1',
      currency: 'ILS',
      sizes: [
        {
          providerId: 's',
          providerName: 'Small',
          semanticTag: null,
          price: { amountMinor: 3500, currency: 'ILS' }
        }
      ],
      crusts: [
        {
          providerId: 'thin',
          providerName: 'Thin',
          semanticTag: null,
          price: { amountMinor: 0, currency: 'ILS' }
        }
      ],
      sauces: [
        { providerName: 'tomato', semanticTag: null },
        { providerName: 'white', semanticTag: null }
      ],
      toppings: [
        {
          providerId: 't1',
          providerName: 'mushroom',
          semanticTag: null,
          price: { amountMinor: 400, currency: 'ILS' }
        }
      ]
    })
  })

  test('normalizes a decimal-based menu into integer agorot', () => {
    const result = normalizeMenuResponse({
      pizzeria_id: 'p2',
      currency: 'ILS',
      price_unit: 'decimal',
      sizes: [{ id: 'sm', label: 'S', price: 33.9 }],
      crusts: [{ id: 'classic', label: 'Classic', price: 0 }],
      sauces: ['tomato', 'pesto'],
      toppings: [{ id: 'x9', name: 'Funghi', price: 4.5 }]
    })

    assert.deepEqual(result, {
      pizzeriaId: 'p2',
      currency: 'ILS',
      sizes: [
        {
          providerId: 'sm',
          providerName: 'S',
          semanticTag: null,
          price: { amountMinor: 3390, currency: 'ILS' }
        }
      ],
      crusts: [
        {
          providerId: 'classic',
          providerName: 'Classic',
          semanticTag: null,
          price: { amountMinor: 0, currency: 'ILS' }
        }
      ],
      sauces: [
        { providerName: 'tomato', semanticTag: null },
        { providerName: 'pesto', semanticTag: null }
      ],
      toppings: [
        {
          providerId: 'x9',
          providerName: 'Funghi',
          semanticTag: null,
          price: { amountMinor: 450, currency: 'ILS' }
        }
      ]
    })
  })

  test('defaults a missing cents menu currency to ILS', () => {
    const result = normalizeMenuResponse({
      pizzeriaId: 'p19',
      priceUnit: 'cents',
      menu: {
        sizes: [{ id: 's', label: 'Piccola', priceCents: 4500 }],
        crusts: [{ id: 'pan', label: 'Pan', priceCents: 0 }],
        sauces: ['tomato'],
        toppings: [{ id: 'm1', name: 'onion', priceCents: 340 }]
      }
    })

    assert.equal(result.currency, 'ILS')
    assert.deepEqual(result.sizes[0]?.price, {
      amountMinor: 4500,
      currency: 'ILS'
    })
  })

  test('defaults a missing decimal menu currency to ILS', () => {
    const result = normalizeMenuResponse({
      pizzeria_id: 'p40',
      price_unit: 'decimal',
      sizes: [{ id: 'sm', label: 'S', price: 32 }],
      crusts: [{ id: 'sourdough', label: 'Sourdough', price: 4 }],
      sauces: ['tomato'],
      toppings: [{ id: 'v1', name: 'caramelized onion', price: 4.4 }]
    })

    assert.equal(result.currency, 'ILS')
    assert.deepEqual(result.sizes[0]?.price, {
      amountMinor: 3200,
      currency: 'ILS'
    })
    assert.deepEqual(result.toppings[0]?.price, {
      amountMinor: 440,
      currency: 'ILS'
    })
  })

  test('still rejects an empty or non-string currency', () => {
    assert.throws(
      () =>
        normalizeMenuResponse({
          pizzeriaId: 'p1',
          currency: '',
          priceUnit: 'cents',
          menu: {
            sizes: [],
            crusts: [],
            sauces: [],
            toppings: []
          }
        }),
      PizzeriaApiAdapterError
    )

    assert.throws(
      () =>
        normalizeMenuResponse({
          pizzeria_id: 'p2',
          currency: null,
          price_unit: 'decimal',
          sizes: [],
          crusts: [],
          sauces: [],
          toppings: []
        }),
      PizzeriaApiAdapterError
    )
  })

  test('uses only the documented discriminator fields', () => {
    assert.throws(
      () =>
        normalizeMenuResponse({
          priceUnit: 'decimal',
          price_unit: 'decimal'
        }),
      PizzeriaApiAdapterError
    )

    assert.throws(
      () => normalizeMenuResponse({ sizes: [], toppings: [] }),
      PizzeriaApiAdapterError
    )
  })

  test('rejects malformed prices instead of rounding them', () => {
    assert.throws(
      () =>
        normalizeMenuResponse({
          pizzeria_id: 'p2',
          currency: 'ILS',
          price_unit: 'decimal',
          sizes: [{ id: 'sm', label: 'S', price: 33.999 }],
          crusts: [],
          sauces: [],
          toppings: []
        }),
      /more than two fractional digits/
    )
  })

  test('rejects unsupported decimal currencies explicitly', () => {
    assert.throws(
      () =>
        normalizeMenuResponse({
          pizzeria_id: 'p2',
          currency: 'USD',
          price_unit: 'decimal',
          sizes: [{ id: 'sm', label: 'S', price: 33.9 }],
          crusts: [],
          sauces: [],
          toppings: []
        }),
      /Unsupported decimal currency/
    )
  })
})
