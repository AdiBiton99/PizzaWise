import { Link } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { OrderHistoryPanel } from '../features/orders/OrderHistoryPanel'
import { useTranslate } from '../i18n'

export function OrdersPage() {
  const t = useTranslate()
  const { user, lastPlacedOrder, recentOrders, setUser } = useAppSession()

  if (user === null) {
    return null
  }

  return (
    <div className="page-stack">
      <header className="page-intro">
        <p className="eyebrow">{t('orders.eyebrow')}</p>
        <h1>{t('orders.title')}</h1>
        <p>{t('orders.lead')}</p>
      </header>
      <div className="surface-card">
        <OrderHistoryPanel
          key={user.id}
          user={user}
          lastPlacedOrder={lastPlacedOrder}
          recentOrders={recentOrders}
          onUserChange={setUser}
        />
      </div>
      <Link className="button-secondary" to="/compare">
        {t('orders.back')}
      </Link>
    </div>
  )
}
