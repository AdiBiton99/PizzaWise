import { Link, NavLink } from 'react-router'
import { useAppSession } from './AppSession'

export function AppHeader() {
  const { user } = useAppSession()

  return (
    <header className="app-header">
      <NavLink className="brand" to="/">
        PizzaWise
      </NavLink>
      <nav className="app-nav" aria-label="Main">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/build">Build Pizza</NavLink>
        {user !== null && <NavLink to="/favorites">Favorites</NavLink>}
        {user !== null && <NavLink to="/orders">Orders</NavLink>}
        {user !== null && <NavLink to="/account">Account</NavLink>}
      </nav>
      {user === null && (
        <div className="auth-actions">
          <Link className="button-secondary" to="/account?mode=login">
            Log in
          </Link>
          <Link className="button-primary" to="/account?mode=register">
            Sign up
          </Link>
        </div>
      )}
    </header>
  )
}
