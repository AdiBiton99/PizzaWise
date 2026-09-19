import fp from 'fastify-plugin'
import {
  createDatabaseFromEnv,
  type Database
} from '../db/index.js'

export interface DatabasePluginOptions {
  readonly db?: Database
  readonly pingDatabase?: () => Promise<void>
}

export default fp<DatabasePluginOptions>(
  async (fastify, options) => {
    if (options.db !== undefined) {
      fastify.decorate('db', options.db)
      fastify.decorate(
        'pingDatabase',
        options.pingDatabase ?? (async () => undefined)
      )
      return
    }

    const connection = createDatabaseFromEnv()
    fastify.decorate('db', connection.db)
    fastify.decorate(
      'pingDatabase',
      options.pingDatabase ?? (async () => {
        await connection.ping()
      })
    )
    fastify.addHook('onClose', async () => {
      await connection.close()
    })
  },
  {
    name: 'database'
  }
)

declare module 'fastify' {
  export interface FastifyInstance {
    db: Database
    pingDatabase: () => Promise<void>
  }
}
