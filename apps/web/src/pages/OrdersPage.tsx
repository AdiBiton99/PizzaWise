import { Link } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { OrderHistoryPanel } from '../features/orders/OrderHistoryPanel'

export function OrdersPage() {
  const { user, lastPlacedOrder, recentOrders, setUser } = useAppSession()

  if (user === null) {
    return null
  }

  return (
    <div className="page-stack">
      <header className="page-intro">
        <p className="eyebrow">Past orders</p>
        <h1>Order history</h1>
        <p>Snapshots stay as they were placed—no live re-price on this page.</p>
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
        Back to compare
      </Link>
    </div>
  )
}
