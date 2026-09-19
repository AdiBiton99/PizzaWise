import type { Order, PizzaConfiguration } from '@pizzawise/shared'
import { describe, expect, it, vi } from 'vitest'
import {
  OrdersRequestError,
  createOrder,
  getOrder,
  listOrders
} from './orders-api'

const PIZZA: PizzaConfiguration = {
  sizeTag: 'large',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['mushroom']
}

const ORDER: Order = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  pizzeriaId: 'p2',
  pizzeriaName: 'Live Slice',
  configuration: PIZZA,
  total: { amountMinor: 1750, currency: 'ILS' },
  phone: '0501234567',
  fulfillmentType: 'pickup',
  deliveryAddress: null,
  status: 'placed',
  createdAt: '2026-09-17T21:00:00.000Z'
}

describe('orders API', () => {
  it('places a pickup order without a delivery address or price', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/orders')
      expect(init?.method).toBe('POST')
      expect(init?.credentials).toBe('include')
      expect(JSON.parse(String(init?.body))).toEqual({
        pizzeriaId: 'p2',
        configuration: {
          sizeTag: 'large',
          crustTag: 'thin',
          sauceTag: 'tomato',
          toppingTags: ['mushroom']
        },
        phone: '0501234567',
        fulfillmentType: 'pickup'
      })
      return jsonResponse(ORDER, 201)
    })

    await expect(
      createOrder(
        {
          pizzeriaId: 'p2',
          configuration: PIZZA,
          phone: '0501234567',
          fulfillmentType: 'pickup'
        },
        fetch
      )
    ).resolves.toEqual(ORDER)
  })

  it('places a delivery order with an address', async () => {
    const fetch = vi.fn(async (_input, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        pizzeriaId: 'p2',
        configuration: {
          sizeTag: 'large',
          crustTag: 'thin',
          sauceTag: 'tomato',
          toppingTags: ['mushroom']
        },
        phone: '0501234567',
        fulfillmentType: 'delivery',
        deliveryAddress: '10 Herzl St'
      })
      return jsonResponse(
        {
          ...ORDER,
          fulfillmentType: 'delivery',
          deliveryAddress: '10 Herzl St'
        },
        201
      )
    })

    await expect(
      createOrder(
        {
          pizzeriaId: 'p2',
          configuration: PIZZA,
          phone: '0501234567',
          fulfillmentType: 'delivery',
          deliveryAddress: '10 Herzl St'
        },
        fetch
      )
    ).resolves.toMatchObject({
      fulfillmentType: 'delivery',
      deliveryAddress: '10 Herzl St'
    })
  })

  it('lists stored orders with credentials included', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe('/api/orders')
      expect(init?.method).toBe('GET')
      expect(init?.credentials).toBe('include')
      return jsonResponse({ orders: [ORDER] })
    })

    await expect(listOrders(fetch)).resolves.toEqual([ORDER])
  })

  it('loads a stored order snapshot by id', async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(input).toBe(`/api/orders/${ORDER.id}`)
      expect(init?.method).toBe('GET')
      expect(init?.credentials).toBe('include')
      return jsonResponse(ORDER)
    })

    await expect(getOrder(ORDER.id, fetch)).resolves.toEqual(ORDER)
  })

  it('maps a missing order to not-found', async () => {
    await expect(
      getOrder(
        ORDER.id,
        vi.fn(async () => jsonResponse({ message: 'Order not found' }, 404))
      )
    ).rejects.toMatchObject({
      code: 'not-found',
      message: 'Order not found'
    })
  })

  it('maps 401, 409, and 404', async () => {
    await expect(
      createOrder(pickupRequest(), vi.fn(async () => jsonResponse({ message: 'Authentication required' }, 401)))
    ).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'Authentication required'
    })

    await expect(
      createOrder(
        pickupRequest(),
        vi.fn(async () =>
          jsonResponse({ message: 'Pizza is not available at this pizzeria' }, 409)
        )
      )
    ).rejects.toMatchObject({
      code: 'conflict',
      message: 'Pizza is not available at this pizzeria'
    })

    await expect(
      createOrder(
        pickupRequest(),
        vi.fn(async () => jsonResponse({ message: 'Pizzeria not found' }, 404))
      )
    ).rejects.toMatchObject({
      code: 'not-found',
      message: 'Pizzeria not found'
    })
  })

  it('maps 502 to a request failure', async () => {
    await expect(
      createOrder(
        pickupRequest(),
        vi.fn(async () =>
          jsonResponse({ message: 'Pizzeria service unavailable' }, 502)
        )
      )
    ).rejects.toBeInstanceOf(OrdersRequestError)
    await expect(
      createOrder(
        pickupRequest(),
        vi.fn(async () =>
          jsonResponse({ message: 'Pizzeria service unavailable' }, 502)
        )
      )
    ).rejects.toMatchObject({
      code: 'request-failed',
      message: 'Pizzeria service unavailable'
    })
  })
})

function pickupRequest () {
  return {
    pizzeriaId: 'p2',
    configuration: PIZZA,
    phone: '0501234567',
    fulfillmentType: 'pickup' as const
  }
}

function jsonResponse (body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
