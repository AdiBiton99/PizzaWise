import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assertOrderBodyShape,
  OrderValidationError,
  parseOrderRequest
} from '../../src/orders/order-fields.js'

const configuration = {
  sizeTag: 'large',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['onion', 'mushroom']
}

const pickupBody = {
  pizzeriaId: 'p2',
  configuration,
  phone: '0501234567',
  fulfillmentType: 'pickup'
}

test('parses pickup and delivery bodies', () => {
  assert.deepEqual(parseOrderRequest(pickupBody), {
    pizzeriaId: 'p2',
    configuration: {
      sizeTag: 'large',
      crustTag: 'thin',
      sauceTag: 'tomato',
      toppingTags: ['mushroom', 'onion']
    },
    phone: '0501234567',
    fulfillmentType: 'pickup',
    deliveryAddress: null
  })

  assert.equal(
    parseOrderRequest({
      ...pickupBody,
      fulfillmentType: 'delivery',
      deliveryAddress: '  10 Herzl St  '
    }).deliveryAddress,
    '10 Herzl St'
  )
})

test('rejects extra fields, pickup addresses, and empty delivery addresses', () => {
  assert.throws(
    () => assertOrderBodyShape({ ...pickupBody, total: 12 }),
    OrderValidationError
  )
  assert.throws(
    () => assertOrderBodyShape({
      ...pickupBody,
      fulfillmentType: 'delivery'
    }),
    OrderValidationError
  )
  assert.throws(
    () => assertOrderBodyShape({
      ...pickupBody,
      deliveryAddress: 'x'
    }),
    OrderValidationError
  )
  assert.throws(
    () => parseOrderRequest({
      ...pickupBody,
      fulfillmentType: 'delivery',
      deliveryAddress: '   '
    }),
    OrderValidationError
  )
})
