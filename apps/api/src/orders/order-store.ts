import type {
  FulfillmentType,
  Money,
  OrderStatus,
  PizzaConfiguration
} from '@pizzawise/shared'

export interface OrderRecord {
  readonly id: string
  readonly userId: string
  readonly pizzeriaId: string
  readonly pizzeriaName: string
  readonly configuration: PizzaConfiguration
  readonly total: Money
  readonly phone: string
  readonly fulfillmentType: FulfillmentType
  readonly deliveryAddress: string | null
  readonly status: OrderStatus
  readonly createdAt: Date
}

export interface OrderStore {
  create(order: OrderRecord): Promise<void>
  listByUserId(userId: string): Promise<readonly OrderRecord[]>
  findByUserIdAndId(userId: string, id: string): Promise<OrderRecord | null>
}

export function compareOrdersNewestFirst (
  left: OrderRecord,
  right: OrderRecord
): number {
  const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime()
  if (byCreatedAt !== 0) {
    return byCreatedAt
  }

  return left.id.localeCompare(right.id)
}

export function sortedToppingTags (
  toppingTags: readonly string[]
): readonly string[] {
  return [...toppingTags].sort((left, right) => left.localeCompare(right))
}
