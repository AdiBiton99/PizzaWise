import { useSearchParams } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { AccountPanel } from '../features/account/AccountPanel'
import type { AuthMode } from '../features/account/AuthForm'
import { useTranslate } from '../i18n'

export function AccountPage() {
  const t = useTranslate()
  const { user, sessionStatus, sessionError, retrySession, setUser } =
    useAppSession()
  const [searchParams] = useSearchParams()
  const initialAuthMode: AuthMode =
    searchParams.get('mode') === 'register' ? 'register' : 'login'

  return (
    <div className="page-stack">
      <header className="page-intro">
        <p className="eyebrow">
          {user === null ? t('account.eyebrowGuest') : t('account.eyebrow')}
        </p>
        <h1>{user === null ? t('account.titleGuest') : t('account.title')}</h1>
        <p>{user === null ? t('account.leadGuest') : t('account.lead')}</p>
      </header>
      <div className="surface-card auth-card">
        <AccountPanel
          user={user}
          onUserChange={setUser}
          sessionStatus={sessionStatus}
          sessionError={sessionError}
          onRetrySession={retrySession}
          initialAuthMode={initialAuthMode}
          skipSessionRestore
        />
      </div>
    </div>
  )
}
