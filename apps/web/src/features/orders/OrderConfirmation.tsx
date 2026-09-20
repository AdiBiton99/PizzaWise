import { type Order } from '@pizzawise/shared'
import { optionLabel, useTranslate } from '../../i18n'
import { formatPrice } from '../comparison/comparison-format'

interface OrderConfirmationProps {
  readonly order: Order
  readonly heading?: string
}

export function OrderConfirmation({
  order,
  heading
}: OrderConfirmationProps) {
  const t = useTranslate()
  const toppingSummary =
    order.configuration.toppingTags.length === 0
      ? t('builder.none')
      : order.configuration.toppingTags.map((tag) => optionLabel(t, tag)).join(', ')

  return (
    <div className="order-confirmation">
      <h4>{heading ?? t('confirm.placed')}</h4>
      <dl>
        <div>
          <dt>{t('confirm.pizzeria')}</dt>
          <dd>{order.pizzeriaName}</dd>
        </div>
        <div>
          <dt>{t('confirm.total')}</dt>
          <dd>{formatPrice(order.total, t)}</dd>
        </div>
        <div>
          <dt>{t('confirm.fulfillment')}</dt>
          <dd>
            {order.fulfillmentType === 'delivery'
              ? t('checkout.delivery')
              : t('checkout.pickup')}
          </dd>
        </div>
        {order.deliveryAddress !== null && (
          <div>
            <dt>{t('confirm.address')}</dt>
            <dd>{order.deliveryAddress}</dd>
          </div>
        )}
        <div>
          <dt>{t('confirm.phone')}</dt>
          <dd>{order.phone}</dd>
        </div>
        <div>
          <dt>{t('confirm.pizza')}</dt>
          <dd>
            {optionLabel(t, order.configuration.sizeTag)},{' '}
            {optionLabel(t, order.configuration.crustTag)},{' '}
            {optionLabel(t, order.configuration.sauceTag)}, {toppingSummary}
          </dd>
        </div>
        <div>
          <dt>{t('confirm.status')}</dt>
          <dd>
            {order.status === 'placed' ? t('confirm.statusPlaced') : order.status}
          </dd>
        </div>
      </dl>
    </div>
  )
}
