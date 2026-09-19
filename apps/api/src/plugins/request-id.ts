import fp from 'fastify-plugin'
import { REQUEST_ID_HEADER } from '../observability.js'

export default fp(
  async (fastify) => {
    fastify.addHook('onRequest', async (request, reply) => {
      void reply.header(REQUEST_ID_HEADER, request.id)
    })
  },
  {
    name: 'request-id'
  }
)
