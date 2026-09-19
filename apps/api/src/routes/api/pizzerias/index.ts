import type { ComparisonPriority, UserLocation } from '@pizzawise/shared'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import {
  assertCompareBodyShape,
  compareNearbyPizzas,
  CompareRequestError,
  parseCompareRequest
} from '../../../domain/comparison/index.js'
import { findNearbyPizzerias } from '../../../domain/location/index.js'
import { fetchNearbyPizzeriaMenus } from '../../../domain/menus/index.js'
import { matchNearbyPizzeriaPizzas } from '../../../domain/pizza-matching/index.js'
import {
  PizzeriaApiAdapterError,
  PizzeriaApiClientError
} from '../../../integrations/pizzeria-api/index.js'

interface MenuParams {
  id: string
}

interface NearbyPizzeriasBody {
  location: UserLocation
  radiusKm?: number
}

interface ComparePizzasBody {
  location: UserLocation
  radiusKm?: number
  configuration: {
    sizeTag: string
    crustTag: string
    sauceTag: string
    toppingTags: string[]
  }
  priority?: ComparisonPriority
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

const pizzerias: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async () =>
    await usePizzeriaApi(fastify, async () =>
      await fastify.pizzeriaApiClient.getPizzerias()
    )
  )

  fastify.post<{ Body: NearbyPizzeriasBody }>(
    '/nearby',
    {
      schema: {
        body: {
          type: 'object',
          required: ['location'],
          additionalProperties: false,
          properties: {
            location: {
              type: 'object',
              required: ['latitude', 'longitude'],
              additionalProperties: false,
              properties: {
                latitude: {
                  type: 'number',
                  minimum: -90,
                  maximum: 90
                },
                longitude: {
                  type: 'number',
                  minimum: -180,
                  maximum: 180
                }
              }
            },
            radiusKm: {
              type: 'number',
              minimum: 0
            }
          }
        }
      }
    },
    async (request) => {
      const canonicalPizzerias = await usePizzeriaApi(
        fastify,
        async () => await fastify.pizzeriaApiClient.getPizzerias()
      )

      return {
        ...(request.body.radiusKm === undefined
          ? {}
          : { radiusKm: request.body.radiusKm }),
        pizzerias: findNearbyPizzerias(
          request.body.location,
          canonicalPizzerias,
          request.body.radiusKm
        )
      }
    }
  )

  const locationSchema = {
    type: 'object',
    required: ['latitude', 'longitude'],
    additionalProperties: false,
    properties: {
      latitude: {
        type: 'number',
        minimum: -90,
        maximum: 90
      },
      longitude: {
        type: 'number',
        minimum: -180,
        maximum: 180
      }
    }
  } as const

  const compareBodySchema = {
    type: 'object',
    required: ['location', 'configuration'],
    additionalProperties: false,
    properties: {
      location: locationSchema,
      radiusKm: {
        type: 'number',
        minimum: 0
      },
      configuration: {
        type: 'object',
        required: ['sizeTag', 'crustTag', 'sauceTag', 'toppingTags'],
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
      priority: {
        type: 'string',
        enum: ['price', 'distance', 'eta']
      }
    }
  } as const

  fastify.post<{ Body: ComparePizzasBody }>(
    '/compare',
    {
      preValidation: async (request) => {
        try {
          assertCompareBodyShape(request.body)
        } catch (error) {
          if (error instanceof CompareRequestError) {
            throw fastify.httpErrors.badRequest(error.message)
          }
          throw error
        }
      },
      schema: { body: compareBodySchema }
    },
    async (request) => {
      let parsed
      try {
        parsed = parseCompareRequest({
          location: request.body.location,
          configuration: request.body.configuration,
          ...(request.body.radiusKm === undefined
            ? {}
            : { radiusKm: request.body.radiusKm }),
          ...(request.body.priority === undefined
            ? {}
            : { priority: request.body.priority })
        })
      } catch (error) {
        if (error instanceof CompareRequestError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }

      const canonicalPizzerias = await usePizzeriaApi(
        fastify,
        async () => await fastify.pizzeriaApiClient.getPizzerias()
      )

      let nearby
      try {
        nearby = findNearbyPizzerias(
          parsed.location,
          canonicalPizzerias,
          parsed.radiusKm
        )
      } catch (error) {
        if (error instanceof RangeError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }

      const menus = await fetchNearbyPizzeriaMenus(
        nearby,
        fastify.pizzeriaApiClient
      )
      const matches = matchNearbyPizzeriaPizzas(parsed.configuration, menus)
      const uncheckedPizzeriaCount = menus.filter(
        (result) => result.status === 'unavailable'
      ).length

      try {
        return {
          ...compareNearbyPizzas(matches, parsed.priority),
          uncheckedPizzeriaCount
        }
      } catch (error) {
        if (error instanceof RangeError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }
    }
  )

  fastify.get<{ Params: MenuParams }>(
    '/:id/menu',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          properties: {
            id: {
              type: 'string',
              minLength: 1
            }
          }
        }
      }
    },
    async (request) =>
      await usePizzeriaApi(fastify, async () =>
        await fastify.pizzeriaApiClient.getMenu(request.params.id)
      )
  )
}

export default pizzerias
