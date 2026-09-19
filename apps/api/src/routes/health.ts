import type { FastifyPluginAsync } from 'fastify'

const health: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get(
    '/health',
    { logLevel: 'silent' },
    async (_request, reply) => {
      try {
        await fastify.pingDatabase()
        return {
          status: 'ok'
        }
      } catch {
        fastify.log.warn(
          { event: 'health.database' },
          'Database ping failed'
        )
        return await reply.code(503).send({
          status: 'unhealthy'
        })
      }
    }
  )
}

export default health
