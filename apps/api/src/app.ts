import * as path from 'node:path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync } from 'fastify'
import { fileURLToPath } from 'node:url'
import type { AuthPluginOptions } from './plugins/session.js'
import type { DatabasePluginOptions } from './plugins/database.js'
import type { GeocodingProviderPluginOptions } from './plugins/geocoding-provider.js'
import type { PizzeriaApiClientPluginOptions } from './plugins/pizzeria-api-client.js'
import type { FavoritePluginOptions } from './plugins/favorites.js'
import type { OrderPluginOptions } from './plugins/orders.js'
import type { ProfilePluginOptions } from './plugins/profile.js'
import { createServerObservabilityOptions } from './observability.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions> &
  AuthPluginOptions &
  DatabasePluginOptions &
  GeocodingProviderPluginOptions &
  PizzeriaApiClientPluginOptions &
  ProfilePluginOptions &
  FavoritePluginOptions &
  OrderPluginOptions

// Pass --options via CLI arguments in command to enable these options.
const options = createServerObservabilityOptions()

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: opts,
    forceESM: true
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: opts,
    forceESM: true
  })
}

export default app
export { app, options }
