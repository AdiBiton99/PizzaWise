import {
  pizzaOptionLabel,
  type Order
} from '@pizzawise/shared'
import { formatPrice } from '../comparison/comparison-format'

interface OrderConfirmationProps {
  readonly order: Order
  readonly heading?: string
}

export function OrderConfirmation({
  order,
  heading = 'Order placed'
}: OrderConfirmationProps) {
  const toppingSummary =
    order.configuration.toppingTags.length === 0
      ? 'None'
      : order.configuration.toppingTags.map(pizzaOptionLabel).join(', ')

  return (
    <div className="order-confirmation">
      <h4>{heading}</h4>
      <dl>
        <div>
          <dt>Pizzeria</dt>
          <dd>{order.pizzeriaName}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
        <div>
          <dt>Fulfillment</dt>
          <dd>
            {order.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
          </dd>
        </div>
        {order.deliveryAddress !== null && (
          <div>
            <dt>Address</dt>
            <dd>{order.deliveryAddress}</dd>
          </div>
        )}
        <div>
          <dt>Phone</dt>
          <dd>{order.phone}</dd>
        </div>
        <div>
          <dt>Pizza</dt>
          <dd>
            {pizzaOptionLabel(order.configuration.sizeTag)},{' '}
            {pizzaOptionLabel(order.configuration.crustTag)},{' '}
            {pizzaOptionLabel(order.configuration.sauceTag)}, {toppingSummary}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{order.status}</dd>
        </div>
      </dl>
    </div>
  )
}
