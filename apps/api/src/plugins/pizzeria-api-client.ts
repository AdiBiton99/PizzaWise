import type { Menu, Pizzeria } from '@pizzawise/shared'
import fp from 'fastify-plugin'
import { createPizzeriaApiClientFromEnv } from '../integrations/pizzeria-api/index.js'

export interface PizzeriaApiClientContract {
  getPizzerias(): Promise<Pizzeria[]>
  getMenu(pizzeriaId: string): Promise<Menu>
}

export interface PizzeriaApiClientPluginOptions {
  readonly pizzeriaApiClient?: PizzeriaApiClientContract
}

export default fp<PizzeriaApiClientPluginOptions>(
  async (fastify, options) => {
    const client =
      options.pizzeriaApiClient ??
      createPizzeriaApiClientFromEnv(process.env, {
        warn: (fields, message) => {
          fastify.log.warn(fields, message)
        }
      })

    fastify.decorate('pizzeriaApiClient', client)
  },
  {
    name: 'pizzeria-api-client'
  }
)

declare module 'fastify' {
  export interface FastifyInstance {
    pizzeriaApiClient: PizzeriaApiClientContract
  }
}
