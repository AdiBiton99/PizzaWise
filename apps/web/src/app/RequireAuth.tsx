import { Navigate, Outlet } from 'react-router'
import { useAppSession } from './AppSession'

export function RequireAuth() {
  const { user, sessionStatus } = useAppSession()

  if (sessionStatus === 'loading') {
    return <p>Checking account…</p>
  }

  if (user === null) {
    return <Navigate to="/account?mode=login" replace />
  }

  return <Outlet />
}
