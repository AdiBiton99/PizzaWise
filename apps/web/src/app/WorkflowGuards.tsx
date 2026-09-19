import { Navigate, Outlet } from 'react-router'
import { useAppSession } from './AppSession'

export function RequirePizza() {
  const { pizza } = useAppSession()

  if (pizza === null) {
    return <Navigate to="/build" replace />
  }

  return <Outlet />
}

export function RequireLocation() {
  const { location } = useAppSession()

  if (location === null) {
    return <Navigate to="/location" replace />
  }

  return <Outlet />
}
