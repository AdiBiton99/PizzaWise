import { Link, Navigate, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import { useAppSession } from '../app/AppSession'
import { OrderConfirmation } from '../features/orders/OrderConfirmation'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { OrdersRequestError, getOrder } from '../features/orders/orders-api'
import type { Order } from '@pizzawise/shared'
import { useTranslate } from '../i18n'

export function OrderConfirmationPage() {
  const t = useTranslate()
  const { id } = useParams<{ id: string }>()
  const { user, recentOrders, lastPlacedOrder, setUser } = useAppSession()
  const known =
    lastPlacedOrder?.id === id
      ? lastPlacedOrder
      : recentOrders.find((order) => order.id === id)
  const [order, setOrder] = useState<Order | null>(known ?? null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (id === undefined || known !== undefined) {
      return
    }

    let cancelled = false
    void getOrder(id)
      .then((nextOrder) => {
        if (!cancelled) {
          setOrder(nextOrder)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof OrdersRequestError && error.code === 'unauthorized') {
          setUser(null)
          return
        }
        setErrorMessage(
          error instanceof OrdersRequestError
            ? error.message
            : t('confirm.loadFailed')
        )
      })

    return () => {
      cancelled = true
    }
  }, [id, known, setUser, t])

  if (user === null) {
    return <Navigate to="/account?mode=login" replace />
  }

  if (id === undefined) {
    return <Navigate to="/orders" replace />
  }

  return (
    <div className="page-stack">
      <WorkflowProgress current="confirm" />
      <header className="page-intro">
        <p className="eyebrow">{t('workflow.stepOf', { current: 5, total: 5 })}</p>
        <h1>{t('confirm.title')}</h1>
      </header>
      <div className="surface-card">
        {order !== null ? (
          <OrderConfirmation order={order} heading={t('confirm.placed')} />
        ) : errorMessage !== null ? (
          <p role="alert">{errorMessage}</p>
        ) : (
          <p>{t('confirm.loading')}</p>
        )}
      </div>
      <div className="builder-actions">
        <Link className="button-primary" to="/orders">
          {t('confirm.history')}
        </Link>
        <Link className="button-secondary" to="/build">
          {t('confirm.another')}
        </Link>
      </div>
    </div>
  )
}
