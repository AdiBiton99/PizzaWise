import fp from 'fastify-plugin'
import type { preHandlerAsyncHookHandler } from 'fastify'
import { MysqlSessionStore } from '../auth/mysql-session-store.js'
import { MysqlUserStore } from '../auth/mysql-user-store.js'
import { readActiveSession } from '../auth/read-active-session.js'
import type { SessionStore } from '../auth/session-store.js'
import type { UserRecord, UserStore } from '../auth/user-store.js'

export interface AuthPluginOptions {
  readonly userStore?: UserStore
  readonly sessionStore?: SessionStore
}

export default fp<AuthPluginOptions>(
  async (fastify, options) => {
    fastify.decorate(
      'userStore',
      options.userStore ?? new MysqlUserStore(fastify.db)
    )
    fastify.decorate(
      'sessionStore',
      options.sessionStore ?? new MysqlSessionStore(fastify.db)
    )
    fastify.decorateRequest('user', undefined as unknown as UserRecord)

    const authenticate: preHandlerAsyncHookHandler = async (request) => {
      const session = await readActiveSession(fastify.sessionStore, request)
      if (session === null) {
        throw fastify.httpErrors.unauthorized('Authentication required')
      }

      const user = await fastify.userStore.findById(session.userId)
      if (user === null) {
        await fastify.sessionStore.deleteByTokenHash(session.tokenHash)
        throw fastify.httpErrors.unauthorized('Authentication required')
      }

      request.user = user
    }

    fastify.decorate('authenticate', authenticate)
  },
  {
    name: 'auth',
    dependencies: ['database', 'cookie']
  }
)

declare module 'fastify' {
  export interface FastifyInstance {
    userStore: UserStore
    sessionStore: SessionStore
    authenticate: preHandlerAsyncHookHandler
  }

  export interface FastifyRequest {
    user: UserRecord
  }
}
