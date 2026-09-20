import type { FastifyPluginAsync } from 'fastify'
import { GeocodingProviderError } from '../../../domain/geocoding/index.js'

const GEOCODING_RESULT_LIMIT = 5
const MAX_QUERY_LENGTH = 200

interface LocationSearchBody {
  query: string
}

interface LocationReverseBody {
  latitude: number
  longitude: number
}

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

const locations: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{ Body: LocationSearchBody }>(
    '/search',
    {
      schema: {
        body: {
          type: 'object',
          required: ['query'],
          additionalProperties: false,
          properties: {
            query: {
              type: 'string'
            }
          }
        }
      }
    },
    async (request, reply) => {
      const query = request.body.query.trim()

      if (query.length === 0) {
        throw fastify.httpErrors.badRequest('Location query must not be empty')
      }

      if (query.length > MAX_QUERY_LENGTH) {
        throw fastify.httpErrors.badRequest(
          `Location query must not exceed ${MAX_QUERY_LENGTH} characters`
        )
      }

      reply.header('Cache-Control', 'no-store')

      try {
        const results = await fastify.geocodingProvider.search(
          query,
          GEOCODING_RESULT_LIMIT
        )

        return { results }
      } catch (error) {
        throw geocodingHttpError(fastify, reply, error)
      }
    }
  )

  fastify.post<{ Body: LocationReverseBody }>(
    '/reverse',
    {
      schema: {
        body: locationSchema
      }
    },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store')

      try {
        const result = await fastify.geocodingProvider.reverse({
          latitude: request.body.latitude,
          longitude: request.body.longitude
        })

        return { result }
      } catch (error) {
        throw geocodingHttpError(fastify, reply, error)
      }
    }
  )
}

function geocodingHttpError (
  fastify: Parameters<FastifyPluginAsync>[0],
  reply: { header(name: string, value: string): unknown },
  error: unknown
): unknown {
  if (
    error instanceof GeocodingProviderError &&
    error.kind === 'rate-limited'
  ) {
    if (error.retryAfterSeconds !== undefined) {
      reply.header('Retry-After', String(error.retryAfterSeconds))
    }

    return fastify.httpErrors.tooManyRequests(
      'Location search is temporarily rate limited'
    )
  }

  if (error instanceof GeocodingProviderError) {
    return fastify.httpErrors.badGateway(
      'Location search service unavailable'
    )
  }

  return error
}

export default locations
