import {
  compareOrdersNewestFirst,
  type OrderRecord,
  type OrderStore
} from './order-store.js'

export class MemoryOrderStore implements OrderStore {
  readonly #orders: OrderRecord[] = []

  async create (order: OrderRecord): Promise<void> {
    this.#orders.push(order)
  }

  async listByUserId (userId: string): Promise<readonly OrderRecord[]> {
    return this.#orders
      .filter((order) => order.userId === userId)
      .sort(compareOrdersNewestFirst)
  }

  async findByUserIdAndId (
    userId: string,
    id: string
  ): Promise<OrderRecord | null> {
    return this.#orders.find((order) =>
      order.id === id && order.userId === userId
    ) ?? null
  }

  get size (): number {
    return this.#orders.length
  }

  get records (): readonly OrderRecord[] {
    return this.#orders
  }
}
