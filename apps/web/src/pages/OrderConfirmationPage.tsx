import { Link, Navigate, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import { useAppSession } from '../app/AppSession'
import { OrderConfirmation } from '../features/orders/OrderConfirmation'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { OrdersRequestError, getOrder } from '../features/orders/orders-api'
import type { Order } from '@pizzawise/shared'

export function OrderConfirmationPage() {
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
            : 'Could not load the order.'
        )
      })

    return () => {
      cancelled = true
    }
  }, [id, known, setUser])

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
        <p className="eyebrow">Step 5 of 5</p>
        <h1>Order confirmation</h1>
      </header>
      <div className="surface-card">
        {order !== null ? (
          <OrderConfirmation order={order} heading="Order placed" />
        ) : errorMessage !== null ? (
          <p role="alert">{errorMessage}</p>
        ) : (
          <p>Loading order…</p>
        )}
      </div>
      <div className="builder-actions">
        <Link className="button-primary" to="/orders">
          View order history
        </Link>
        <Link className="button-secondary" to="/build">
          Build another pizza
        </Link>
      </div>
    </div>
  )
}
