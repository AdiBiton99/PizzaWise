import type { Menu, Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  PizzeriaApiAdapterError,
  PizzeriaApiClientError
} from '../../src/integrations/pizzeria-api/index.js'
import type { PizzeriaApiClientContract } from '../../src/plugins/pizzeria-api-client.js'
import { build } from '../helper.js'

const PIZZERIAS: Pizzeria[] = [
  {
    id: 'p2',
    name: 'Funghi Bros',
    latitude: 32.0809,
    longitude: 34.7806,
    averageEta: {
      minMinutes: 40,
      maxMinutes: 40,
      minutes: 40
    }
  }
]

const MENU: Menu = {
  pizzeriaId: 'p2/branch',
  currency: 'ILS',
  sizes: [
    {
      providerId: 'sm',
      providerName: 'S',
      semanticTag: null,
      price: {
        amountMinor: 3390,
        currency: 'ILS'
      }
    }
  ],
  crusts: [],
  sauces: [],
  toppings: []
}

describe('pizzeria routes', () => {
  test('returns canonical pizzerias from the injected client', async (t) => {
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return PIZZERIAS
      },
      async getMenu () {
        throw new Error('Unexpected menu request')
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'GET',
      url: '/api/pizzerias'
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), PIZZERIAS)
  })

  test('returns nearby pizzerias without requesting menus', async (t) => {
    let pizzeriaListCalls = 0
    let menuCalls = 0
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        pizzeriaListCalls += 1
        return PIZZERIAS
      },
      async getMenu () {
        menuCalls += 1
        throw new Error('Unexpected menu request')
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/nearby',
      payload: {
        location: {
          latitude: 32.0809,
          longitude: 34.7806
        },
        radiusKm: 5
      }
    })

    assert.equal(response.statusCode, 200)
    assert.equal(pizzeriaListCalls, 1)
    assert.equal(menuCalls, 0)
    assert.deepEqual(response.json(), {
      radiusKm: 5,
      pizzerias: [
        {
          pizzeria: PIZZERIAS[0],
          distanceKm: 0
        }
      ]
    })
  })

  test('validates nearby location and radius input', async (t) => {
    let clientCalls = 0
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        clientCalls += 1
        return PIZZERIAS
      },
      async getMenu () {
        throw new Error('Unexpected menu request')
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const invalidPayloads = [
      {},
      {
        location: { latitude: 91, longitude: 34.8 },
        radiusKm: 5
      },
      {
        location: { latitude: 32.08, longitude: 181 },
        radiusKm: 5
      },
      {
        location: { latitude: 32.08, longitude: 34.8 },
        radiusKm: -1
      }
    ]

    for (const payload of invalidPayloads) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pizzerias/nearby',
        payload
      })
      assert.equal(response.statusCode, 400)
    }

    assert.equal(clientCalls, 0)
  })

  test('returns an empty nearby list when nothing is in range', async (t) => {
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return PIZZERIAS
      },
      async getMenu () {
        throw new Error('Unexpected menu request')
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/nearby',
      payload: {
        location: { latitude: 0, longitude: 0 },
        radiusKm: 1
      }
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), {
      radiusKm: 1,
      pizzerias: []
    })
  })

  test('returns every pizzeria when nearby radiusKm is omitted', async (t) => {
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return PIZZERIAS
      },
      async getMenu () {
        throw new Error('Unexpected menu request')
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/nearby',
      payload: {
        location: { latitude: 0, longitude: 0 }
      }
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().radiusKm, undefined)
    assert.equal(response.json().pizzerias.length, 1)
    assert.equal(response.json().pizzerias[0]?.pizzeria.id, 'p2')
  })

  test('translates nearby-list upstream failures to a generic 502', async (t) => {
    const client = failingClient(
      new PizzeriaApiClientError('sensitive nearby detail', { status: 500 })
    )
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/nearby',
      payload: {
        location: { latitude: 32.08, longitude: 34.78 },
        radiusKm: 5
      }
    })

    assert.equal(response.statusCode, 502)
    assert.equal(response.json().message, 'Pizzeria service unavailable')
    assert.doesNotMatch(response.body, /sensitive nearby detail/)
  })

  test('decodes the route ID and returns its canonical menu', async (t) => {
    let requestedPizzeriaId: string | undefined
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        throw new Error('Unexpected pizzeria list request')
      },
      async getMenu (pizzeriaId) {
        requestedPizzeriaId = pizzeriaId
        return MENU
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'GET',
      url: '/api/pizzerias/p2%2Fbranch/menu'
    })

    assert.equal(response.statusCode, 200)
    assert.equal(requestedPizzeriaId, 'p2/branch')
    assert.deepEqual(response.json(), MENU)
  })

  test('translates an external 404 without exposing upstream details', async (t) => {
    const client = failingClient(
      new PizzeriaApiClientError('upstream detail', { status: 404 })
    )
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'GET',
      url: '/api/pizzerias/missing/menu'
    })

    assert.equal(response.statusCode, 404)
    assert.equal(response.json().message, 'Pizzeria not found')
    assert.doesNotMatch(response.body, /upstream detail/)
  })

  test('translates non-404 upstream failures to a generic 502', async (t) => {
    for (const status of [401, 429, 500]) {
      const client = failingClient(
        new PizzeriaApiClientError('sensitive upstream detail', { status })
      )
      const app = await build(t, { pizzeriaApiClient: client })

      const response = await app.inject({
        method: 'GET',
        url: '/api/pizzerias'
      })

      assert.equal(response.statusCode, 502)
      assert.equal(response.json().message, 'Pizzeria service unavailable')
      assert.doesNotMatch(response.body, /sensitive upstream detail/)
    }
  })

  test('translates malformed upstream data to a generic 502', async (t) => {
    const client = failingClient(
      new PizzeriaApiAdapterError('malformed upstream detail')
    )
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'GET',
      url: '/api/pizzerias'
    })

    assert.equal(response.statusCode, 502)
    assert.equal(response.json().message, 'Pizzeria service unavailable')
    assert.doesNotMatch(response.body, /malformed upstream detail/)
  })
})

const COMPARE_LOCATION = {
  latitude: 32.0809,
  longitude: 34.7806
}

const COMPARE_CONFIGURATION = {
  sizeTag: 'large',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: [] as string[]
}

const NEAR_PIZZERIA: Pizzeria = {
  id: 'p-near',
  name: 'Near Slice',
  latitude: 32.0809,
  longitude: 34.7806,
  averageEta: {
    minMinutes: 10,
    maxMinutes: 12,
    minutes: 11
  }
}

const FAR_PIZZERIA: Pizzeria = {
  id: 'p-far',
  name: 'Far Slice',
  latitude: 32.1079,
  longitude: 34.7806,
  averageEta: {
    minMinutes: 40,
    maxMinutes: 40,
    minutes: 40
  }
}

describe('POST /api/pizzerias/compare', () => {
  test('ranks matched nearby pizzas using the existing comparison pipeline', async (t) => {
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return [NEAR_PIZZERIA, FAR_PIZZERIA]
      },
      async getMenu (id) {
        if (id === 'p-near') {
          return matchingMenu('p-near', 5000)
        }
        if (id === 'p-far') {
          return matchingMenu('p-far', 400)
        }
        throw new Error(`Unexpected menu request for ${id}`)
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 5,
        configuration: COMPARE_CONFIGURATION,
        priority: 'price'
      }
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.equal(body.ranked.length, 2)
    assert.equal(body.ranked[0]?.nearby.pizzeria.id, 'p-far')
    assert.equal(body.ranked[0]?.rank, 1)
    assert.equal(body.ranked[0]?.total.amountMinor, 900)
    assert.equal(body.ranked[1]?.nearby.pizzeria.id, 'p-near')
    assert.equal(body.uncheckedPizzeriaCount, 0)
    assert.deepEqual(body.debug, {
      consideredPizzeriaCount: 2,
      checkedPizzeriaCount: 2,
      recoveredPizzeriaCount: 0,
      uncheckedPizzeriaCount: 0,
      matchedPizzeriaCount: 2
    })
  })

  test('omits unmatched and failed menus and respects radiusKm', async (t) => {
    const unmatched: Pizzeria = {
      ...NEAR_PIZZERIA,
      id: 'p-unmatched',
      name: 'No Match'
    }
    const failed: Pizzeria = {
      ...NEAR_PIZZERIA,
      id: 'p-failed',
      name: 'Failed Menu'
    }
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return [NEAR_PIZZERIA, FAR_PIZZERIA, unmatched, failed]
      },
      async getMenu (id) {
        if (id === 'p-near') {
          return matchingMenu('p-near', 5000)
        }
        if (id === 'p-far') {
          return matchingMenu('p-far', 400)
        }
        if (id === 'p-unmatched') {
          return {
            ...matchingMenu('p-unmatched', 1000),
            sizes: []
          }
        }
        throw new PizzeriaApiClientError('menu failed', { status: 500 })
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const closeOnly = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 2,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(closeOnly.statusCode, 200)
    assert.deepEqual(
      closeOnly.json().ranked.map((pizza: { nearby: { pizzeria: { id: string } } }) =>
        pizza.nearby.pizzeria.id
      ),
      ['p-near']
    )
    assert.equal(closeOnly.json().uncheckedPizzeriaCount, 1)

    const wider = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 5,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(wider.statusCode, 200)
    assert.equal(wider.json().ranked.length, 2)
    assert.equal(wider.json().uncheckedPizzeriaCount, 1)

    const unlimited = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(unlimited.statusCode, 200)
    assert.equal(unlimited.json().ranked.length, 2)
  })

  test('returns an empty ranking when nothing matches', async (t) => {
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return [NEAR_PIZZERIA]
      },
      async getMenu () {
        return {
          ...matchingMenu('p-near', 1000),
          sizes: []
        }
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 5,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), {
      ranked: [],
      uncheckedPizzeriaCount: 0,
      debug: {
        consideredPizzeriaCount: 1,
        checkedPizzeriaCount: 1,
        recoveredPizzeriaCount: 0,
        uncheckedPizzeriaCount: 0,
        matchedPizzeriaCount: 0
      }
    })
  })

  test('rejects extra fields, unknown tags, and invalid priority', async (t) => {
    const client = failingClient(new Error('should not be called'))
    const app = await build(t, { pizzeriaApiClient: client })
    const valid = {
      location: COMPARE_LOCATION,
      radiusKm: 5,
      configuration: COMPARE_CONFIGURATION
    }

    const invalidPayloads = [
      { ...valid, extra: true },
      { ...valid, configuration: { ...COMPARE_CONFIGURATION, extra: 'no' } },
      { ...valid, configuration: { ...COMPARE_CONFIGURATION, sizeTag: 'party' } },
      { ...valid, priority: 'popularity' },
      { location: COMPARE_LOCATION, radiusKm: 5 },
      {
        ...valid,
        location: { ...COMPARE_LOCATION, extra: 1 }
      }
    ]

    for (const payload of invalidPayloads) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pizzerias/compare',
        payload
      })
      assert.equal(response.statusCode, 400)
    }
  })

  test('translates pizzeria-list failures to a generic 502', async (t) => {
    const client = failingClient(
      new PizzeriaApiClientError('sensitive compare detail', { status: 500 })
    )
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 5,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(response.statusCode, 502)
    assert.equal(response.json().message, 'Pizzeria service unavailable')
    assert.doesNotMatch(response.body, /sensitive compare detail/)
  })

  test('returns ranked matches and an unchecked count when some menus fail', async (t) => {
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return [NEAR_PIZZERIA, FAR_PIZZERIA]
      },
      async getMenu (id) {
        if (id === 'p-near') {
          return matchingMenu('p-near', 5000)
        }
        throw new PizzeriaApiClientError('menu down', { status: 503 })
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 5,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().ranked.length, 1)
    assert.equal(response.json().ranked[0]?.nearby.pizzeria.id, 'p-near')
    assert.equal(response.json().uncheckedPizzeriaCount, 1)
    assert.deepEqual(response.json().debug, {
      consideredPizzeriaCount: 2,
      checkedPizzeriaCount: 1,
      recoveredPizzeriaCount: 0,
      uncheckedPizzeriaCount: 1,
      matchedPizzeriaCount: 1
    })
  })

  test('recovers a first-pass menu failure and includes it in ranking', async (t) => {
    const attempts = new Map<string, number>()
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return [NEAR_PIZZERIA, FAR_PIZZERIA]
      },
      async getMenu (id) {
        const attempt = (attempts.get(id) ?? 0) + 1
        attempts.set(id, attempt)
        if (id === 'p-far' && attempt === 1) {
          throw new PizzeriaApiClientError('transient menu down', { status: 500 })
        }
        return matchingMenu(id, id === 'p-near' ? 5000 : 400)
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 5,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(response.statusCode, 200)
    assert.equal(attempts.get('p-near'), 1)
    assert.equal(attempts.get('p-far'), 2)
    assert.equal(response.json().ranked.length, 2)
    assert.equal(response.json().uncheckedPizzeriaCount, 0)
    assert.deepEqual(response.json().debug, {
      consideredPizzeriaCount: 2,
      checkedPizzeriaCount: 1,
      recoveredPizzeriaCount: 1,
      uncheckedPizzeriaCount: 0,
      matchedPizzeriaCount: 2
    })
  })

  test('does not treat an empty ranking caused by failed menus as no matches', async (t) => {
    const client: PizzeriaApiClientContract = {
      async getPizzerias () {
        return [NEAR_PIZZERIA]
      },
      async getMenu () {
        throw new PizzeriaApiClientError('menu down', { status: 500 })
      }
    }
    const app = await build(t, { pizzeriaApiClient: client })

    const response = await app.inject({
      method: 'POST',
      url: '/api/pizzerias/compare',
      payload: {
        location: COMPARE_LOCATION,
        radiusKm: 5,
        configuration: COMPARE_CONFIGURATION
      }
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), {
      ranked: [],
      uncheckedPizzeriaCount: 1,
      debug: {
        consideredPizzeriaCount: 1,
        checkedPizzeriaCount: 0,
        recoveredPizzeriaCount: 0,
        uncheckedPizzeriaCount: 1,
        matchedPizzeriaCount: 0
      }
    })
  })
})

function matchingMenu (id: string, sizeAmountMinor: number): Menu {
  return {
    pizzeriaId: id,
    currency: 'ILS',
    sizes: [
      {
        providerId: 'sz-l',
        providerName: 'Large',
        semanticTag: 'large',
        price: { amountMinor: sizeAmountMinor, currency: 'ILS' }
      }
    ],
    crusts: [
      {
        providerId: 'cr-thin',
        providerName: 'Thin',
        semanticTag: 'thin',
        price: { amountMinor: 500, currency: 'ILS' }
      }
    ],
    sauces: [
      {
        providerName: 'tomato',
        semanticTag: 'tomato'
      }
    ],
    toppings: []
  }
}

function failingClient (error: Error): PizzeriaApiClientContract {
  return {
    async getPizzerias () {
      throw error
    },
    async getMenu () {
      throw error
    }
  }
}
