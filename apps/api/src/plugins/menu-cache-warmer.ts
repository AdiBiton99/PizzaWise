import fp from 'fastify-plugin'
import { MenuCacheWarmer } from '../domain/menus/index.js'

export default fp(
  async (fastify) => {
    const warmer = new MenuCacheWarmer(fastify.pizzeriaApiClient, {
      warn: (fields, message) => {
        fastify.log.warn(fields, message)
      }
    })

    fastify.addHook('onListen', async () => {
      warmer.start()
    })

    fastify.addHook('onClose', async () => {
      warmer.stop()
    })
  },
  {
    name: 'menu-cache-warmer',
    dependencies: ['pizzeria-api-client']
  }
)
