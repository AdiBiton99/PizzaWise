import { useLocale, useTranslate } from '../../i18n'
import type { Order, PublicUser } from '@pizzawise/shared'
import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '../comparison/comparison-format'
import { formatOrderPlacedAt } from './format-order-date'
import { OrderConfirmation } from './OrderConfirmation'
import {
  type GetOrder,
  type ListOrders,
  OrdersRequestError,
  getOrder as requestGetOrder,
  listOrders as requestListOrders
} from './orders-api'

interface OrderHistoryPanelProps {
  readonly user: PublicUser
  readonly lastPlacedOrder: Order | null
  readonly recentOrders?: readonly Order[]
  readonly onUserChange: (user: PublicUser | null) => void
  readonly listOrders?: ListOrders
  readonly getOrder?: GetOrder
}

export function OrderHistoryPanel({
  user,
  lastPlacedOrder,
  recentOrders = [],
  onUserChange,
  listOrders = requestListOrders,
  getOrder = requestGetOrder
}: OrderHistoryPanelProps) {
  const t = useTranslate()
  const { locale } = useLocale()
  const [fetchedOrders, setFetchedOrders] = useState<readonly Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailedOrder, setDetailedOrder] = useState<Order | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const handleUnauthorized = useCallback(() => {
    onUserChange(null)
  }, [onUserChange])

  const loadOrders = useCallback(async () => {
    try {
      const nextOrders = await listOrders()
      setFetchedOrders(nextOrders)
      setErrorMessage(null)
    } catch (error) {
      if (error instanceof OrdersRequestError && error.code === 'unauthorized') {
        handleUnauthorized()
        return
      }

      setErrorMessage(
        error instanceof OrdersRequestError
          ? error.message
          : t('orders.loadFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }, [handleUnauthorized, listOrders, t])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await loadOrders()
      if (cancelled) {
        return
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadOrders])

  const orders = mergeOrderHistory(fetchedOrders, [
    ...recentOrders,
    ...(lastPlacedOrder === null ? [] : [lastPlacedOrder])
  ])

  async function handleViewDetails(id: string) {
    if (selectedOrderId === id) {
      setSelectedOrderId(null)
      setDetailedOrder(null)
      setDetailsError(null)
      return
    }

    setSelectedOrderId(id)
    setDetailedOrder(null)
    setDetailsError(null)
    setIsLoadingDetails(true)

    try {
      const order = await getOrder(id)
      setDetailedOrder(order)
    } catch (error) {
      if (error instanceof OrdersRequestError && error.code === 'unauthorized') {
        handleUnauthorized()
        return
      }

      setDetailsError(
        error instanceof OrdersRequestError
          ? error.message
          : t('confirm.loadFailed')
      )
    } finally {
      setIsLoadingDetails(false)
    }
  }

  return (
    <section className="order-history" aria-labelledby="order-history-heading" data-user-id={user.id}>
      <h2 id="order-history-heading">{t('orders.heading')}</h2>

      <div className="order-history-status" aria-live="polite" aria-busy={isLoading}>
        {isLoading && <p>{t('orders.loading')}</p>}
        {errorMessage !== null && (
          <>
            <p role="alert">{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true)
                void loadOrders()
              }}
            >
              {t('orders.retry')}
            </button>
          </>
        )}
        {!isLoading &&
          errorMessage === null &&
          orders.length === 0 && <p>{t('orders.empty')}</p>}
      </div>

      {orders.length > 0 && (
        <ul className="order-history-list">
          {orders.map((order) => (
            <li key={order.id}>
              <h3>{order.pizzeriaName}</h3>
              <dl>
                <div>
                  <dt>{t('confirm.total')}</dt>
                  <dd>{formatPrice(order.total, t)}</dd>
                </div>
                <div>
                  <dt>{t('orders.date')}</dt>
                  <dd>{formatOrderPlacedAt(order.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt>{t('confirm.status')}</dt>
                  <dd>
                    {order.status === 'placed'
                      ? t('confirm.statusPlaced')
                      : order.status}
                  </dd>
                </div>
                <div>
                  <dt>{t('confirm.fulfillment')}</dt>
                  <dd>
                    {order.fulfillmentType === 'delivery'
                      ? t('checkout.delivery')
                      : t('checkout.pickup')}
                  </dd>
                </div>
              </dl>
              <div className="builder-actions">
                <button
                  type="button"
                  onClick={() => void handleViewDetails(order.id)}
                >
                  {selectedOrderId === order.id ? t('orders.hideDetails') : t('orders.viewDetails')}
                </button>
              </div>
              {selectedOrderId === order.id && (
                <div className="order-history-details">
                  {isLoadingDetails && <p>{t('confirm.loading')}</p>}
                  {detailsError !== null && (
                    <p role="alert">{detailsError}</p>
                  )}
                  {detailedOrder !== null && (
                    <OrderConfirmation
                      order={detailedOrder}
                      heading={t('orders.details')}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function mergeOrderHistory (
  fetched: readonly Order[],
  placed: readonly Order[]
): Order[] {
  const fetchedIds = new Set(fetched.map((order) => order.id))
  const extra = placed.filter((order) => !fetchedIds.has(order.id))
  return [...extra, ...fetched]
}
