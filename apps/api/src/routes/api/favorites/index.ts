import { randomUUID } from 'node:crypto'
import type { FavoritePizza } from '@pizzawise/shared'
import type { FastifyPluginAsync } from 'fastify'
import { uuidToBinary } from '../../../db/uuid.js'
import {
  assertFavoriteBodyShape,
  FavoriteValidationError,
  parseFavoriteInput
} from '../../../favorites/favorite-fields.js'
import type { FavoriteRecord } from '../../../favorites/favorite-store.js'

interface FavoriteBody {
  name: string
  sizeTag: string
  crustTag: string
  sauceTag: string
  toppingTags: string[]
}

interface FavoriteParams {
  id: string
}

const favoriteBodySchema = {
  type: 'object',
  required: ['name', 'sizeTag', 'crustTag', 'sauceTag', 'toppingTags'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    sizeTag: { type: 'string' },
    crustTag: { type: 'string' },
    sauceTag: { type: 'string' },
    toppingTags: {
      type: 'array',
      items: { type: 'string' }
    }
  }
} as const

const favorites: FastifyPluginAsync = async (fastify): Promise<void> => {
  async function parseBody (body: FavoriteBody) {
    try {
      assertFavoriteBodyShape(body)
      return parseFavoriteInput(body)
    } catch (error) {
      if (error instanceof FavoriteValidationError) {
        throw fastify.httpErrors.badRequest(error.message)
      }
      throw error
    }
  }

  function parseFavoriteId (id: string): string {
    try {
      uuidToBinary(id)
      return id
    } catch (error) {
      if (error instanceof RangeError) {
        throw fastify.httpErrors.badRequest('Favorite id is invalid')
      }
      throw error
    }
  }

  fastify.get(
    '/',
    { preHandler: fastify.authenticate },
    async (request) => {
      const records = await fastify.favoriteStore.listByUserId(request.user.id)
      return {
        favorites: records.map(toFavoritePizza)
      }
    }
  )

  fastify.post<{ Body: FavoriteBody }>(
    '/',
    {
      preHandler: fastify.authenticate,
      preValidation: async (request) => {
        try {
          assertFavoriteBodyShape(request.body)
        } catch (error) {
          if (error instanceof FavoriteValidationError) {
            throw fastify.httpErrors.badRequest(error.message)
          }
          throw error
        }
      },
      schema: { body: favoriteBodySchema }
    },
    async (request, reply) => {
      const input = await parseBody(request.body)
      const record: FavoriteRecord = {
        id: randomUUID(),
        userId: request.user.id,
        name: input.name,
        configuration: input.configuration
      }
      await fastify.favoriteStore.create(record)
      return reply.code(201).send(toFavoritePizza(record))
    }
  )

  fastify.put<{ Body: FavoriteBody, Params: FavoriteParams }>(
    '/:id',
    {
      preHandler: fastify.authenticate,
      preValidation: async (request) => {
        try {
          assertFavoriteBodyShape(request.body)
        } catch (error) {
          if (error instanceof FavoriteValidationError) {
            throw fastify.httpErrors.badRequest(error.message)
          }
          throw error
        }
      },
      schema: { body: favoriteBodySchema }
    },
    async (request) => {
      const id = parseFavoriteId(request.params.id)
      const input = await parseBody(request.body)
      const record: FavoriteRecord = {
        id,
        userId: request.user.id,
        name: input.name,
        configuration: input.configuration
      }
      const updated = await fastify.favoriteStore.update(
        request.user.id,
        record
      )
      if (!updated) {
        throw fastify.httpErrors.notFound('Favorite not found')
      }
      return toFavoritePizza(record)
    }
  )

  fastify.delete<{ Params: FavoriteParams }>(
    '/:id',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const id = parseFavoriteId(request.params.id)
      const deleted = await fastify.favoriteStore.delete(request.user.id, id)
      if (!deleted) {
        throw fastify.httpErrors.notFound('Favorite not found')
      }
      return reply.code(204).send()
    }
  )
}

function toFavoritePizza (record: FavoriteRecord): FavoritePizza {
  return {
    id: record.id,
    name: record.name,
    configuration: record.configuration
  }
}

export default favorites
