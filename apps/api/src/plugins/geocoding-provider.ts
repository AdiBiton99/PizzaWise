import fp from 'fastify-plugin'
import type { GeocodingProvider } from '../domain/geocoding/index.js'
import { createGeoapifyProviderFromEnv } from '../integrations/geoapify/index.js'

export interface GeocodingProviderPluginOptions {
  readonly geocodingProvider?: GeocodingProvider
}

export default fp<GeocodingProviderPluginOptions>(
  async (fastify, options) => {
    const provider =
      options.geocodingProvider ??
      createGeoapifyProviderFromEnv(process.env, {
        warn: (fields, message) => {
          fastify.log.warn(fields, message)
        }
      })

    fastify.decorate('geocodingProvider', provider)
  },
  {
    name: 'geocoding-provider'
  }
)

declare module 'fastify' {
  export interface FastifyInstance {
    geocodingProvider: GeocodingProvider
  }
}
