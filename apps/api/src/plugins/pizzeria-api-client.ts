import type { Menu, Pizzeria } from '@pizzawise/shared'
import fp from 'fastify-plugin'
import { PizzeriaDirectoryGateway } from '../domain/location/index.js'
import { PizzeriaMenuGateway } from '../domain/menus/index.js'
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
    if (options.pizzeriaApiClient !== undefined) {
      fastify.decorate('pizzeriaApiClient', options.pizzeriaApiClient)
      return
    }

    const client = createPizzeriaApiClientFromEnv(process.env, {
      warn: (fields, message) => {
        fastify.log.warn(fields, message)
      }
    })
    const directory = new PizzeriaDirectoryGateway(
      async () => await client.getPizzerias()
    )
    const menus = new PizzeriaMenuGateway(
      async (pizzeriaId) => await client.getMenu(pizzeriaId),
      {
        warn: (fields, message) => {
          fastify.log.warn(fields, message)
        }
      }
    )

    fastify.decorate('pizzeriaApiClient', {
      getPizzerias: async () => await directory.getPizzerias(),
      getMenu: async (pizzeriaId) => await menus.getMenu(pizzeriaId)
    })
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
