import { Link, Navigate, useNavigate } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { WorkflowProgress } from '../app/WorkflowProgress'
import { OrderCheckout } from '../features/orders/OrderCheckout'
import { useTranslate } from '../i18n'

export function CheckoutPage() {
  const t = useTranslate()
  const {
    user,
    sessionStatus,
    pizza,
    location,
    comparisonOutcome,
    checkoutPizzeriaId,
    setUser,
    recordPlacedOrder
  } = useAppSession()
  const navigate = useNavigate()

  if (sessionStatus === 'loading') {
    return <p>{t('session.checking')}</p>
  }

  if (user === null) {
    return <Navigate to="/account?mode=login" replace />
  }

  if (pizza === null) {
    return <Navigate to="/build" replace />
  }

  if (location === null) {
    return <Navigate to="/location" replace />
  }

  if (checkoutPizzeriaId === null) {
    return <Navigate to="/compare" replace />
  }

  const ranked =
    comparisonOutcome?.kind === 'success'
      ? comparisonOutcome.ranked.find(
        (item) => item.nearby.pizzeria.id === checkoutPizzeriaId
      )
      : undefined

  if (ranked === undefined) {
    return <Navigate to="/compare" replace />
  }

  return (
    <div className="page-stack">
      <WorkflowProgress current="checkout" />
      <header className="page-intro">
        <p className="eyebrow">{t('workflow.stepOf', { current: 4, total: 5 })}</p>
        <h1>{t('checkout.title', { name: ranked.nearby.pizzeria.name })}</h1>
        <p>{t('checkout.lead')}</p>
      </header>
      <div className="surface-card checkout-card">
        <OrderCheckout
          user={user}
          pizzeriaId={ranked.nearby.pizzeria.id}
          pizzeriaName={ranked.nearby.pizzeria.name}
          pizza={pizza}
          onUserChange={setUser}
          onOrderPlaced={(order) => {
            recordPlacedOrder(order)
            void navigate(`/order/${order.id}`)
          }}
        />
      </div>
      <Link className="button-secondary" to="/compare">
        {t('checkout.back')}
      </Link>
    </div>
  )
}
