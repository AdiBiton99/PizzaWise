import { Navigate, Outlet } from 'react-router'
import { useTranslate } from '../i18n'
import { useAppSession } from './AppSession'

export function RequireAuth() {
  const { user, sessionStatus } = useAppSession()
  const t = useTranslate()

  if (sessionStatus === 'loading') {
    return <p>{t('session.checking')}</p>
  }

  if (user === null) {
    return <Navigate to="/account?mode=login" replace />
  }

  return <Outlet />
}
