import fp from 'fastify-plugin'
import { MysqlProfileStore } from '../profiles/mysql-profile-store.js'
import type { ProfileStore } from '../profiles/profile-store.js'

export interface ProfilePluginOptions {
  readonly profileStore?: ProfileStore
}

export default fp<ProfilePluginOptions>(
  async (fastify, options) => {
    fastify.decorate(
      'profileStore',
      options.profileStore ?? new MysqlProfileStore(fastify.db)
    )
  },
  {
    name: 'profile',
    dependencies: ['database']
  }
)

declare module 'fastify' {
  export interface FastifyInstance {
    profileStore: ProfileStore
  }
}
