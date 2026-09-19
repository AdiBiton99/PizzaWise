import type {
  FulfillmentType,
  Money,
  Order,
  PizzaConfiguration
} from '@pizzawise/shared'
import { readErrorMessage } from '../account/auth-api'

export type OrdersErrorCode =
  | 'unauthorized'
  | 'invalid'
  | 'not-found'
  | 'conflict'
  | 'invalid-response'
  | 'request-failed'

export class OrdersRequestError extends Error {
  readonly code: OrdersErrorCode

  constructor (code: OrdersErrorCode, message: string) {
    super(message)
    this.name = 'OrdersRequestError'
    this.code = code
  }
}

type HttpFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export interface CreateOrderRequest {
  readonly pizzeriaId: string
  readonly configuration: PizzaConfiguration
  readonly phone: string
  readonly fulfillmentType: FulfillmentType
  readonly deliveryAddress?: string
}

export type CreateOrder = (request: CreateOrderRequest) => Promise<Order>
export type ListOrders = () => Promise<readonly Order[]>
export type GetOrder = (id: string) => Promise<Order>

export async function createOrder (
  request: CreateOrderRequest,
  fetch: HttpFetch = globalThis.fetch
): Promise<Order> {
  const response = await requestHttp(
    '/api/orders',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toOrderBody(request))
    },
    fetch
  )

  if (!response.ok) {
    throw await toOrdersError(response, 'Could not place the order.')
  }

  return await readOrder(response)
}

export async function listOrders (
  fetch: HttpFetch = globalThis.fetch
): Promise<readonly Order[]> {
  const response = await requestHttp('/api/orders', { method: 'GET' }, fetch)

  if (!response.ok) {
    throw await toOrdersError(response, 'Could not load orders.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new OrdersRequestError(
      'invalid-response',
      'Orders returned invalid JSON.'
    )
  }

  if (!isOrdersList(payload)) {
    throw new OrdersRequestError(
      'invalid-response',
      'Orders returned an invalid response.'
    )
  }

  return payload.orders
}

export async function getOrder (
  id: string,
  fetch: HttpFetch = globalThis.fetch
): Promise<Order> {
  const response = await requestHttp(
    `/api/orders/${id}`,
    { method: 'GET' },
    fetch
  )

  if (!response.ok) {
    throw await toOrdersError(response, 'Could not load the order.')
  }

  return await readOrder(response)
}

function toOrderBody (
  request: CreateOrderRequest
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    pizzeriaId: request.pizzeriaId,
    configuration: {
      sizeTag: request.configuration.sizeTag,
      crustTag: request.configuration.crustTag,
      sauceTag: request.configuration.sauceTag,
      toppingTags: [...request.configuration.toppingTags]
    },
    phone: request.phone,
    fulfillmentType: request.fulfillmentType
  }

  if (request.fulfillmentType === 'delivery') {
    body.deliveryAddress = request.deliveryAddress
  }

  return body
}

async function requestHttp (
  url: string,
  init: RequestInit,
  fetch: HttpFetch
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...init.headers
      }
    })
  } catch {
    throw new OrdersRequestError(
      'request-failed',
      'Ordering service could not be reached.'
    )
  }
}

async function toOrdersError (
  response: Response,
  fallback: string
): Promise<OrdersRequestError> {
  if (response.status === 401) {
    return new OrdersRequestError(
      'unauthorized',
      await readErrorMessage(response, 'Authentication required')
    )
  }

  if (response.status === 404) {
    return new OrdersRequestError(
      'not-found',
      await readErrorMessage(response, notFoundFallback(fallback))
    )
  }

  if (response.status === 409) {
    return new OrdersRequestError(
      'conflict',
      await readErrorMessage(
        response,
        'Pizza is not available at this pizzeria'
      )
    )
  }

  if (response.status === 400) {
    return new OrdersRequestError(
      'invalid',
      await readErrorMessage(response, 'Order details are invalid.')
    )
  }

  const requestFallback =
    response.status === 502 ? 'Pizzeria service unavailable' : fallback

  return new OrdersRequestError(
    'request-failed',
    await readErrorMessage(response, requestFallback)
  )
}

function notFoundFallback (fallback: string): string {
  if (fallback === 'Could not load the order.') {
    return 'Order not found'
  }

  return 'Pizzeria not found'
}

async function readOrder (response: Response): Promise<Order> {
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new OrdersRequestError(
      'invalid-response',
      'Order returned invalid JSON.'
    )
  }

  if (!isOrder(payload)) {
    throw new OrdersRequestError(
      'invalid-response',
      'Order returned an invalid response.'
    )
  }

  return payload
}

function isOrdersList (value: unknown): value is { orders: Order[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'orders' in value &&
    Array.isArray(value.orders) &&
    value.orders.every(isOrder)
  )
}

function isOrder (value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  if (
    typeof record.id !== 'string' ||
    record.id.length === 0 ||
    typeof record.pizzeriaId !== 'string' ||
    typeof record.pizzeriaName !== 'string' ||
    typeof record.phone !== 'string' ||
    (record.fulfillmentType !== 'delivery' &&
      record.fulfillmentType !== 'pickup') ||
    (record.deliveryAddress !== null &&
      typeof record.deliveryAddress !== 'string') ||
    record.status !== 'placed' ||
    typeof record.createdAt !== 'string' ||
    !isMoney(record.total) ||
    typeof record.configuration !== 'object' ||
    record.configuration === null
  ) {
    return false
  }

  const configuration = record.configuration as Record<string, unknown>
  return (
    typeof configuration.sizeTag === 'string' &&
    typeof configuration.crustTag === 'string' &&
    typeof configuration.sauceTag === 'string' &&
    Array.isArray(configuration.toppingTags) &&
    configuration.toppingTags.every((tag) => typeof tag === 'string')
  )
}

function isMoney (value: unknown): value is Money {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.amountMinor === 'number' &&
    Number.isInteger(record.amountMinor) &&
    typeof record.currency === 'string' &&
    record.currency.length > 0
  )
}
