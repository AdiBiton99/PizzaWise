import type { FastifyPluginAsync } from 'fastify'
import { GeocodingProviderError } from '../../../domain/geocoding/index.js'

const GEOCODING_RESULT_LIMIT = 5
const MAX_QUERY_LENGTH = 200

interface LocationSearchBody {
  query: string
}

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
        if (
          error instanceof GeocodingProviderError &&
          error.kind === 'rate-limited'
        ) {
          if (error.retryAfterSeconds !== undefined) {
            reply.header('Retry-After', String(error.retryAfterSeconds))
          }

          throw fastify.httpErrors.tooManyRequests(
            'Location search is temporarily rate limited'
          )
        }

        if (error instanceof GeocodingProviderError) {
          throw fastify.httpErrors.badGateway(
            'Location search service unavailable'
          )
        }

        throw error
      }
    }
  )
}

export default locations
