import fp from 'fastify-plugin'
import { MysqlFavoriteStore } from '../favorites/mysql-favorite-store.js'
import type { FavoriteStore } from '../favorites/favorite-store.js'

export interface FavoritePluginOptions {
  readonly favoriteStore?: FavoriteStore
}

export default fp<FavoritePluginOptions>(
  async (fastify, options) => {
    fastify.decorate(
      'favoriteStore',
      options.favoriteStore ?? new MysqlFavoriteStore(fastify.db)
    )
  },
  {
    name: 'favorites',
    dependencies: ['database']
  }
)

declare module 'fastify' {
  export interface FastifyInstance {
    favoriteStore: FavoriteStore
  }
}
