import fp from 'fastify-plugin'
import { MysqlOrderStore } from '../orders/mysql-order-store.js'
import type { OrderStore } from '../orders/order-store.js'

export interface OrderPluginOptions {
  readonly orderStore?: OrderStore
}

export default fp<OrderPluginOptions>(
  async (fastify, options) => {
    fastify.decorate(
      'orderStore',
      options.orderStore ?? new MysqlOrderStore(fastify.db)
    )
  },
  {
    name: 'orders',
    dependencies: ['database']
  }
)

declare module 'fastify' {
  export interface FastifyInstance {
    orderStore: OrderStore
  }
}
