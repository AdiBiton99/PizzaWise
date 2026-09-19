import { useSearchParams } from 'react-router'
import { useAppSession } from '../app/AppSession'
import { AccountPanel } from '../features/account/AccountPanel'
import type { AuthMode } from '../features/account/AuthForm'

export function AccountPage() {
  const { user, sessionStatus, sessionError, retrySession, setUser } =
    useAppSession()
  const [searchParams] = useSearchParams()
  const initialAuthMode: AuthMode =
    searchParams.get('mode') === 'register' ? 'register' : 'login'

  return (
    <div className="page-stack">
      <header className="page-intro">
        <p className="eyebrow">Your kitchen profile</p>
        <h1>{user === null ? 'Log in or sign up' : 'Account'}</h1>
        <p>
          Save favorites, place orders, and keep a phone number handy for
          checkout.
        </p>
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
