import type { FulfillmentType, PizzaConfiguration } from '@pizzawise/shared'
import { normalizePhone, PhoneValidationError } from '../domain/phone.js'
import {
  assertPizzaConfigurationShape,
  parsePizzaConfiguration,
  PizzaConfigurationError
} from '../domain/pizza-configuration.js'

export const MAX_DELIVERY_ADDRESS_LENGTH = 200
export const PLACED_ORDER_STATUS = 'placed' as const
export const FULFILLMENT_TYPES = new Set<FulfillmentType>([
  'delivery',
  'pickup'
])

export class OrderValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'OrderValidationError'
  }
}

export interface ParsedOrderRequest {
  readonly pizzeriaId: string
  readonly configuration: PizzaConfiguration
  readonly phone: string
  readonly fulfillmentType: FulfillmentType
  readonly deliveryAddress: string | null
}

export function assertOrderBodyShape (
  body: unknown
): asserts body is {
  pizzeriaId: string
  configuration: unknown
  phone: string
  fulfillmentType: string
  deliveryAddress?: string
} {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new OrderValidationError('Order body is invalid')
  }

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  const fulfillmentType = record.fulfillmentType

  if (typeof fulfillmentType !== 'string') {
    throw new OrderValidationError('Order body is invalid')
  }

  const allowed = allowedKeysForFulfillment(fulfillmentType)
  if (
    keys.length !== allowed.size ||
    keys.some((key) => !allowed.has(key)) ||
    typeof record.pizzeriaId !== 'string' ||
    typeof record.phone !== 'string'
  ) {
    throw new OrderValidationError('Order body is invalid')
  }

  if (fulfillmentType === 'delivery' && typeof record.deliveryAddress !== 'string') {
    throw new OrderValidationError('Order body is invalid')
  }

  try {
    assertPizzaConfigurationShape(record.configuration)
  } catch (error) {
    if (error instanceof PizzaConfigurationError) {
      throw new OrderValidationError(error.message)
    }
    throw error
  }
}

export function parseOrderRequest (body: {
  pizzeriaId: string
  configuration: {
    sizeTag: string
    crustTag: string
    sauceTag: string
    toppingTags: readonly string[]
  }
  phone: string
  fulfillmentType: string
  deliveryAddress?: string
}): ParsedOrderRequest {
  const pizzeriaId = body.pizzeriaId.trim()
  if (pizzeriaId.length === 0) {
    throw new OrderValidationError('Pizzeria id must not be empty')
  }

  if (!FULFILLMENT_TYPES.has(body.fulfillmentType as FulfillmentType)) {
    throw new OrderValidationError('Fulfillment type is invalid')
  }

  const fulfillmentType = body.fulfillmentType as FulfillmentType
  let phone: string
  let configuration: PizzaConfiguration
  try {
    phone = normalizePhone(body.phone)
    configuration = parsePizzaConfiguration(body.configuration)
  } catch (error) {
    if (
      error instanceof PhoneValidationError ||
      error instanceof PizzaConfigurationError
    ) {
      throw new OrderValidationError(error.message)
    }
    throw error
  }

  return {
    pizzeriaId,
    configuration,
    phone,
    fulfillmentType,
    deliveryAddress: parseDeliveryAddress(fulfillmentType, body.deliveryAddress)
  }
}

function allowedKeysForFulfillment (fulfillmentType: string): Set<string> {
  const keys = new Set([
    'pizzeriaId',
    'configuration',
    'phone',
    'fulfillmentType'
  ])
  if (fulfillmentType === 'delivery') {
    keys.add('deliveryAddress')
  }
  return keys
}

function parseDeliveryAddress (
  fulfillmentType: FulfillmentType,
  deliveryAddress: string | undefined
): string | null {
  if (fulfillmentType === 'pickup') {
    return null
  }

  if (deliveryAddress === undefined) {
    throw new OrderValidationError('Delivery address is required')
  }

  const normalized = deliveryAddress.trim()
  if (normalized.length === 0) {
    throw new OrderValidationError('Delivery address must not be empty')
  }
  if (normalized.length > MAX_DELIVERY_ADDRESS_LENGTH) {
    throw new OrderValidationError(
      `Delivery address must not exceed ${MAX_DELIVERY_ADDRESS_LENGTH} characters`
    )
  }

  return normalized
}
