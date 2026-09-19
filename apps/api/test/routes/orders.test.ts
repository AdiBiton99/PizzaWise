import type {
  Menu,
  Pizzeria,
  PizzaSize,
  Crust,
  Sauce,
  SemanticTag,
  Topping
} from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SESSION_COOKIE_NAME } from '../../src/auth/session-cookie.js'
import { PizzeriaApiClientError } from '../../src/integrations/pizzeria-api/index.js'
import { MemoryOrderStore } from '../../src/orders/memory-order-store.js'
import type { PizzeriaApiClientContract } from '../../src/plugins/pizzeria-api-client.js'
import { build } from '../helper.js'

const password = 'password1'
const configuration = {
  sizeTag: 'large',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['mushroom', 'olives']
}

const pizzeria: Pizzeria = {
  id: 'p2',
  name: 'Live Slice',
  latitude: 32.08,
  longitude: 34.78,
  averageEta: null
}

function menuFor (id: string, overrides: Partial<Menu> = {}): Menu {
  return {
    pizzeriaId: id,
    currency: 'ILS',
    sizes: [
      pricedSize('sz-m', 'Medium', 'medium', 800),
      pricedSize('sz-l', 'Large', 'large', 1000)
    ],
    crusts: [pricedCrust('cr-thin', 'Thin', 'thin', 500)],
    sauces: [sauce('tomato', 'tomato')],
    toppings: [
      pricedTopping('tp-mushroom', 'mushroom', 'mushroom', 150),
      pricedTopping('tp-olives', 'Olives', 'olives', 100)
    ],
    ...overrides
  }
}

function stubClient (
  options: {
    pizzerias?: Pizzeria[]
    menu?: Menu
    menuError?: Error
  } = {}
): PizzeriaApiClientContract {
  return {
    async getPizzerias () {
      return options.pizzerias ?? [pizzeria]
    },
    async getMenu () {
      if (options.menuError !== undefined) {
        throw options.menuError
      }
      return options.menu ?? menuFor('p2')
    }
  }
}

async function register (
  app: Awaited<ReturnType<typeof build>>,
  email = 'user@example.com'
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password }
  })
  assert.equal(response.statusCode, 200)
  const cookie = response.cookies.find((item) => item.name === SESSION_COOKIE_NAME)
  assert.ok(cookie)
  return { cookies: { [SESSION_COOKIE_NAME]: cookie.value } }
}

test('POST /api/orders requires authentication', async (t) => {
  const app = await build(t)
  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'pickup'
    }
  })
  assert.equal(response.statusCode, 401)
})

test('places a pickup order using live pizzeria data and calculated price', async (t) => {
  const orderStore = new MemoryOrderStore()
  const app = await build(t, {
    orderStore,
    pizzeriaApiClient: stubClient()
  })
  const { cookies } = await register(app)

  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies,
    payload: {
      pizzeriaId: 'p2',
      configuration: {
        ...configuration,
        toppingTags: ['olives', 'mushroom']
      },
      phone: '050 123-4567',
      fulfillmentType: 'pickup'
    }
  })

  assert.equal(response.statusCode, 201)
  const body = response.json()
  assert.equal(body.pizzeriaId, 'p2')
  assert.equal(body.pizzeriaName, 'Live Slice')
  assert.deepEqual(body.total, { amountMinor: 1750, currency: 'ILS' })
  assert.equal(body.phone, '0501234567')
  assert.equal(body.fulfillmentType, 'pickup')
  assert.equal(body.deliveryAddress, null)
  assert.equal(body.status, 'placed')
  assert.deepEqual(body.configuration.toppingTags, ['mushroom', 'olives'])
  assert.equal(orderStore.size, 1)
  assert.equal('userId' in body, false)
})

test('places a delivery order with a trimmed address', async (t) => {
  const app = await build(t, { pizzeriaApiClient: stubClient() })
  const { cookies } = await register(app)

  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies,
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'delivery',
      deliveryAddress: '  10 Herzl St  '
    }
  })

  assert.equal(response.statusCode, 201)
  assert.equal(response.json().deliveryAddress, '10 Herzl St')
})

test('rejects unexpected fields instead of stripping them', async (t) => {
  const app = await build(t, { pizzeriaApiClient: stubClient() })
  const { cookies } = await register(app)
  const base = {
    pizzeriaId: 'p2',
    configuration,
    phone: '0501234567',
    fulfillmentType: 'pickup'
  }

  for (const payload of [
    { ...base, total: { amountMinor: 1, currency: 'USD' } },
    { ...base, currency: 'USD' },
    { ...base, pizzeriaName: 'Fake' },
    { ...base, userId: 'other' },
    { ...base, deliveryAddress: 'should not be here' }
  ]) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/orders',
      cookies,
      payload
    })
    assert.equal(response.statusCode, 400)
  }
})

test('returns 404 for an unknown pizzeria and 502 when the menu fails', async (t) => {
  const missing = await build(t, {
    pizzeriaApiClient: stubClient({ pizzerias: [] })
  })
  const { cookies: missingCookies } = await register(missing)
  const notFound = await missing.inject({
    method: 'POST',
    url: '/api/orders',
    cookies: missingCookies,
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'pickup'
    }
  })
  assert.equal(notFound.statusCode, 404)

  const failing = await build(t, {
    pizzeriaApiClient: stubClient({
      menuError: new PizzeriaApiClientError('down', { status: 500 })
    })
  })
  const { cookies: failingCookies } = await register(failing)
  const badGateway = await failing.inject({
    method: 'POST',
    url: '/api/orders',
    cookies: failingCookies,
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'pickup'
    }
  })
  assert.equal(badGateway.statusCode, 502)
})

test('returns 502 and inserts nothing when the pizzeria directory fails', async (t) => {
  const orderStore = new MemoryOrderStore()
  const app = await build(t, {
    orderStore,
    pizzeriaApiClient: {
      async getPizzerias () {
        throw new PizzeriaApiClientError('directory down', { status: 500 })
      },
      async getMenu () {
        throw new Error('Should not fetch a menu after a directory failure')
      }
    }
  })
  const { cookies } = await register(app)

  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies,
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'pickup'
    }
  })

  assert.equal(response.statusCode, 502)
  assert.equal(orderStore.size, 0)
})

test('returns 404 and inserts nothing when a listed pizzeria menu is missing', async (t) => {
  const orderStore = new MemoryOrderStore()
  const app = await build(t, {
    orderStore,
    pizzeriaApiClient: stubClient({
      menuError: new PizzeriaApiClientError('missing menu', { status: 404 })
    })
  })
  const { cookies } = await register(app)

  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies,
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'pickup'
    }
  })

  assert.equal(response.statusCode, 404)
  assert.equal(orderStore.size, 0)
})

test('returns 409 and inserts nothing when the live menu cannot match', async (t) => {
  const orderStore = new MemoryOrderStore()
  const app = await build(t, {
    orderStore,
    pizzeriaApiClient: stubClient({
      menu: menuFor('p2', {
        sizes: [pricedSize('sz-m', 'Medium', 'medium', 800)]
      })
    })
  })
  const { cookies } = await register(app)

  const response = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies,
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'pickup'
    }
  })

  assert.equal(response.statusCode, 409)
  assert.equal(orderStore.size, 0)
})

test('GET /api/orders requires authentication and rejects query parameters', async (t) => {
  const app = await build(t, { pizzeriaApiClient: stubClient() })
  const unauthorized = await app.inject({
    method: 'GET',
    url: '/api/orders'
  })
  assert.equal(unauthorized.statusCode, 401)

  const { cookies } = await register(app)
  const extraQuery = await app.inject({
    method: 'GET',
    url: '/api/orders?limit=1',
    cookies
  })
  assert.equal(extraQuery.statusCode, 400)
})

test('lists the authenticated user orders newest first without re-fetching menus', async (t) => {
  let menuCalls = 0
  const pizzeriaApiClient: PizzeriaApiClientContract = {
    async getPizzerias () {
      return [pizzeria]
    },
    async getMenu () {
      menuCalls += 1
      return menuFor('p2')
    }
  }
  const app = await build(t, { pizzeriaApiClient })
  const { cookies } = await register(app)
  const payload = {
    pizzeriaId: 'p2',
    configuration,
    phone: '0501234567',
    fulfillmentType: 'pickup'
  }

  const first = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies,
    payload
  })
  assert.equal(first.statusCode, 201)
  await new Promise((resolve) => setTimeout(resolve, 5))
  const second = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies,
    payload
  })
  assert.equal(second.statusCode, 201)
  assert.equal(menuCalls, 2)

  const listed = await app.inject({
    method: 'GET',
    url: '/api/orders',
    cookies
  })
  assert.equal(listed.statusCode, 200)
  assert.equal(menuCalls, 2)
  const orders = listed.json().orders
  assert.equal(orders.length, 2)
  assert.deepEqual(
    orders.map((order: { id: string }) => order.id),
    [second.json().id, first.json().id]
  )
  assert.deepEqual(orders[0].configuration, second.json().configuration)
  assert.deepEqual(orders[0].total, second.json().total)
})

test('GET /api/orders/:id returns the stored snapshot for the owner only', async (t) => {
  const app = await build(t, { pizzeriaApiClient: stubClient() })
  const userA = await register(app, 'a@example.com')
  const userB = await register(app, 'b@example.com')
  const created = await app.inject({
    method: 'POST',
    url: '/api/orders',
    cookies: userA.cookies,
    payload: {
      pizzeriaId: 'p2',
      configuration,
      phone: '0501234567',
      fulfillmentType: 'pickup'
    }
  })
  assert.equal(created.statusCode, 201)
  const id = created.json().id as string

  const owned = await app.inject({
    method: 'GET',
    url: `/api/orders/${id}`,
    cookies: userA.cookies
  })
  assert.equal(owned.statusCode, 200)
  assert.deepEqual(owned.json(), created.json())

  const otherUser = await app.inject({
    method: 'GET',
    url: `/api/orders/${id}`,
    cookies: userB.cookies
  })
  assert.equal(otherUser.statusCode, 404)

  const bList = await app.inject({
    method: 'GET',
    url: '/api/orders',
    cookies: userB.cookies
  })
  assert.deepEqual(bList.json(), { orders: [] })

  const invalid = await app.inject({
    method: 'GET',
    url: '/api/orders/not-a-uuid',
    cookies: userA.cookies
  })
  assert.equal(invalid.statusCode, 400)
})

function pricedSize (
  providerId: string,
  providerName: string,
  semanticTag: SemanticTag,
  amountMinor: number
): PizzaSize {
  return {
    providerId,
    providerName,
    semanticTag,
    price: { amountMinor, currency: 'ILS' }
  }
}

function pricedCrust (
  providerId: string,
  providerName: string,
  semanticTag: SemanticTag,
  amountMinor: number
): Crust {
  return {
    providerId,
    providerName,
    semanticTag,
    price: { amountMinor, currency: 'ILS' }
  }
}

function pricedTopping (
  providerId: string,
  providerName: string,
  semanticTag: SemanticTag,
  amountMinor: number
): Topping {
  return {
    providerId,
    providerName,
    semanticTag,
    price: { amountMinor, currency: 'ILS' }
  }
}

function sauce (providerName: string, semanticTag: SemanticTag): Sauce {
  return { providerName, semanticTag }
}
