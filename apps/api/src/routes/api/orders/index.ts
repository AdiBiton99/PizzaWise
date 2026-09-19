import { randomUUID } from 'node:crypto'
import type { Order } from '@pizzawise/shared'
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify'
import { uuidToBinary } from '../../../db/uuid.js'
import { matchAndPriceMenu } from '../../../domain/pizza-matching/index.js'
import {
  PizzeriaApiAdapterError,
  PizzeriaApiClientError
} from '../../../integrations/pizzeria-api/index.js'
import {
  assertOrderBodyShape,
  OrderValidationError,
  parseOrderRequest,
  PLACED_ORDER_STATUS
} from '../../../orders/order-fields.js'
import type { OrderRecord } from '../../../orders/order-store.js'

interface OrderBody {
  pizzeriaId: string
  configuration: {
    sizeTag: string
    crustTag: string
    sauceTag: string
    toppingTags: string[]
  }
  phone: string
  fulfillmentType: string
  deliveryAddress?: string
}

const orderBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pizzeriaId: { type: 'string' },
    configuration: {
      type: 'object',
      additionalProperties: false,
      properties: {
        sizeTag: { type: 'string' },
        crustTag: { type: 'string' },
        sauceTag: { type: 'string' },
        toppingTags: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    phone: { type: 'string' },
    fulfillmentType: { type: 'string' },
    deliveryAddress: { type: 'string' }
  }
} as const

interface OrderParams {
  id: string
}

const emptyQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {}
} as const

const orders: FastifyPluginAsync = async (fastify): Promise<void> => {
  function assertNoQuery (request: FastifyRequest): void {
    if (Object.keys(request.query as object).length > 0) {
      throw fastify.httpErrors.badRequest('Query parameters are not allowed')
    }
  }

  function parseOrderId (id: string): string {
    try {
      uuidToBinary(id)
      return id
    } catch (error) {
      if (error instanceof RangeError) {
        throw fastify.httpErrors.badRequest('Order id is invalid')
      }
      throw error
    }
  }

  fastify.get(
    '/',
    {
      preHandler: fastify.authenticate,
      preValidation: async (request) => {
        assertNoQuery(request)
      },
      schema: { querystring: emptyQuerySchema }
    },
    async (request) => {
      const records = await fastify.orderStore.listByUserId(request.user.id)
      return {
        orders: records.map(toOrder)
      }
    }
  )

  fastify.get<{ Params: OrderParams }>(
    '/:id',
    {
      preHandler: fastify.authenticate,
      preValidation: async (request) => {
        assertNoQuery(request)
      },
      schema: { querystring: emptyQuerySchema }
    },
    async (request) => {
      const id = parseOrderId(request.params.id)
      const record = await fastify.orderStore.findByUserIdAndId(
        request.user.id,
        id
      )
      if (record === null) {
        throw fastify.httpErrors.notFound('Order not found')
      }
      return toOrder(record)
    }
  )

  fastify.post<{ Body: OrderBody }>(
    '/',
    {
      preHandler: fastify.authenticate,
      preValidation: async (request) => {
        try {
          assertOrderBodyShape(request.body)
        } catch (error) {
          if (
            error instanceof OrderValidationError
          ) {
            throw fastify.httpErrors.badRequest(error.message)
          }
          throw error
        }
      },
      schema: { body: orderBodySchema }
    },
    async (request, reply) => {
      let parsed
      try {
        parsed = parseOrderRequest(request.body)
      } catch (error) {
        if (error instanceof OrderValidationError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }

      const pizzeria = await usePizzeriaApi(fastify, async () => {
        const directory = await fastify.pizzeriaApiClient.getPizzerias()
        return directory.find((entry) => entry.id === parsed.pizzeriaId) ?? null
      })
      if (pizzeria === null) {
        throw fastify.httpErrors.notFound('Pizzeria not found')
      }

      const menu = await usePizzeriaApi(
        fastify,
        async () => await fastify.pizzeriaApiClient.getMenu(parsed.pizzeriaId)
      )

      const priced = matchAndPriceMenu(parsed.configuration, menu)
      if (priced === null) {
        throw fastify.httpErrors.conflict(
          'Pizza is not available at this pizzeria'
        )
      }

      const createdAt = new Date()
      const record: OrderRecord = {
        id: randomUUID(),
        userId: request.user.id,
        pizzeriaId: pizzeria.id,
        pizzeriaName: pizzeria.name,
        configuration: parsed.configuration,
        total: priced.total,
        phone: parsed.phone,
        fulfillmentType: parsed.fulfillmentType,
        deliveryAddress: parsed.deliveryAddress,
        status: PLACED_ORDER_STATUS,
        createdAt
      }
      await fastify.orderStore.create(record)
      return reply.code(201).send(toOrder(record))
    }
  )
}

async function usePizzeriaApi<T> (
  fastify: FastifyInstance,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof PizzeriaApiClientError && error.status === 404) {
      throw fastify.httpErrors.notFound('Pizzeria not found')
    }

    if (
      error instanceof PizzeriaApiClientError ||
      error instanceof PizzeriaApiAdapterError
    ) {
      throw fastify.httpErrors.badGateway('Pizzeria service unavailable')
    }

    throw error
  }
}

function toOrder (record: OrderRecord): Order {
  return {
    id: record.id,
    pizzeriaId: record.pizzeriaId,
    pizzeriaName: record.pizzeriaName,
    configuration: record.configuration,
    total: record.total,
    phone: record.phone,
    fulfillmentType: record.fulfillmentType,
    deliveryAddress: record.deliveryAddress,
    status: record.status,
    createdAt: record.createdAt.toISOString()
  }
}

export default orders
