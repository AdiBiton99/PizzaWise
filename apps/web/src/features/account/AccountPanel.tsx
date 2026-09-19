import type { PublicUser, UserProfile } from '@pizzawise/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AccountRequestError,
  type GetCurrentUser,
  type LoginUser,
  type LogoutUser,
  type RegisterUser,
  getCurrentUser as requestCurrentUser,
  loginUser as requestLogin,
  logoutUser as requestLogout,
  registerUser as requestRegister
} from './auth-api'
import { AuthForm, type AuthMode } from './AuthForm'
import { ProfileForm } from './ProfileForm'
import {
  type GetProfile,
  type SaveProfile,
  getProfile as requestProfile,
  saveProfile as requestSaveProfile
} from './profile-api'

interface AccountPanelProps {
  readonly user: PublicUser | null
  readonly onUserChange: (user: PublicUser | null) => void
  readonly getCurrentUser?: GetCurrentUser
  readonly registerUser?: RegisterUser
  readonly loginUser?: LoginUser
  readonly logoutUser?: LogoutUser
  readonly getProfile?: GetProfile
  readonly saveProfile?: SaveProfile
  readonly skipSessionRestore?: boolean
  readonly sessionStatus?: 'loading' | 'ready'
  readonly sessionError?: string | null
  readonly onRetrySession?: () => void
  readonly initialAuthMode?: AuthMode
}

export function AccountPanel({
  user,
  onUserChange,
  getCurrentUser = requestCurrentUser,
  registerUser = requestRegister,
  loginUser = requestLogin,
  logoutUser = requestLogout,
  getProfile = requestProfile,
  saveProfile = requestSaveProfile,
  skipSessionRestore = false,
  sessionStatus: sessionStatusProp,
  sessionError: sessionErrorProp,
  onRetrySession,
  initialAuthMode = 'register'
}: AccountPanelProps) {
  const [internalSessionStatus, setInternalSessionStatus] = useState<
    'loading' | 'ready'
  >(skipSessionRestore ? 'ready' : 'loading')
  const [internalSessionError, setInternalSessionError] = useState<string | null>(
    null
  )
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileFormKey, setProfileFormKey] = useState(0)
  const onUserChangeRef = useRef(onUserChange)

  useEffect(() => {
    onUserChangeRef.current = onUserChange
  }, [onUserChange])

  const sessionStatus = sessionStatusProp ?? internalSessionStatus
  const sessionError = sessionErrorProp ?? internalSessionError

  const loadProfile = useCallback(async () => {
    try {
      const nextProfile = await getProfile()
      setProfile(nextProfile)
      setProfileFormKey((key) => key + 1)
      setProfileError(null)
    } catch (error) {
      if (error instanceof AccountRequestError && error.code === 'unauthorized') {
        onUserChangeRef.current(null)
        setProfile(null)
        return
      }

      setProfileError(
        error instanceof AccountRequestError
          ? error.message
          : 'Could not load the profile.'
      )
    }
  }, [getProfile])

  const restoreSession = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      onUserChangeRef.current(currentUser)
      if (currentUser !== null) {
        await loadProfile()
      } else {
        setProfile(null)
      }
      setInternalSessionStatus('ready')
    } catch (error) {
      onUserChangeRef.current(null)
      setProfile(null)
      setInternalSessionStatus('ready')
      setInternalSessionError(
        error instanceof AccountRequestError
          ? error.message
          : 'Could not restore the current session.'
      )
    }
  }, [getCurrentUser, loadProfile])

  useEffect(() => {
    if (skipSessionRestore) {
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const currentUser = await getCurrentUser()
        if (cancelled) {
          return
        }
        onUserChangeRef.current(currentUser)
        if (currentUser !== null) {
          await loadProfile()
        } else {
          setProfile(null)
        }
        setInternalSessionStatus('ready')
      } catch (error) {
        if (cancelled) {
          return
        }
        onUserChangeRef.current(null)
        setProfile(null)
        setInternalSessionStatus('ready')
        setInternalSessionError(
          error instanceof AccountRequestError
            ? error.message
            : 'Could not restore the current session.'
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getCurrentUser, loadProfile, skipSessionRestore])

  useEffect(() => {
    if (!skipSessionRestore || user === null || sessionStatus !== 'ready') {
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const nextProfile = await getProfile()
        if (cancelled) {
          return
        }
        setProfile(nextProfile)
        setProfileFormKey((key) => key + 1)
        setProfileError(null)
      } catch (error) {
        if (cancelled) {
          return
        }
        if (error instanceof AccountRequestError && error.code === 'unauthorized') {
          onUserChangeRef.current(null)
          setProfile(null)
          return
        }

        setProfileError(
          error instanceof AccountRequestError
            ? error.message
            : 'Could not load the profile.'
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getProfile, sessionStatus, skipSessionRestore, user])

  async function handleAuthSubmit(
    mode: AuthMode,
    email: string,
    password: string
  ) {
    setAuthBusy(true)
    setAuthError(null)

    try {
      const nextUser =
        mode === 'register'
          ? await registerUser(email, password)
          : await loginUser(email, password)
      onUserChange(nextUser)
      if (!skipSessionRestore) {
        await loadProfile()
      }
    } catch (error) {
      setAuthError(
        error instanceof AccountRequestError
          ? error.message
          : 'Account request failed.'
      )
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    setAuthBusy(true)
    setAuthError(null)

    try {
      await logoutUser()
      onUserChange(null)
      setProfile(null)
      setProfileError(null)
    } catch (error) {
      setAuthError(
        error instanceof AccountRequestError
          ? error.message
          : 'Could not log out.'
      )
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSaveProfile(displayName: string, phone: string) {
    setProfileBusy(true)
    setProfileError(null)

    try {
      const saved = await saveProfile(displayName, phone)
      setProfile(saved)
      setProfileFormKey((key) => key + 1)
    } catch (error) {
      if (error instanceof AccountRequestError && error.code === 'unauthorized') {
        onUserChangeRef.current(null)
        setProfile(null)
        return
      }

      setProfileError(
        error instanceof AccountRequestError
          ? error.message
          : 'Could not save the profile.'
      )
    } finally {
      setProfileBusy(false)
    }
  }

  return (
    <section className="account-panel" aria-labelledby="account-heading">
      <h2 id="account-heading">Account</h2>

      {sessionStatus === 'loading' && <p>Checking account…</p>}

      {sessionStatus === 'ready' && sessionError !== null && user === null && (
        <div className="account-status">
          <p role="alert">{sessionError}</p>
          <button
            type="button"
            onClick={() => {
              if (onRetrySession !== undefined) {
                onRetrySession()
                return
              }
              setInternalSessionStatus('loading')
              void restoreSession()
            }}
          >
            Retry
          </button>
        </div>
      )}

      {sessionStatus === 'ready' && user === null && sessionError === null && (
        <AuthForm
          key={initialAuthMode}
          initialMode={initialAuthMode}
          isBusy={authBusy}
          errorMessage={authError}
          onSubmit={(mode, email, password) => {
            void handleAuthSubmit(mode, email, password)
          }}
        />
      )}

      {sessionStatus === 'ready' && user !== null && (
        <div className="account-signed-in">
          <p>Signed in as {user.email}</p>
          <button type="button" disabled={authBusy} onClick={() => void handleLogout()}>
            {authBusy ? 'Working…' : 'Log out'}
          </button>
          <ProfileForm
            key={profileFormKey}
            profile={profile}
            isBusy={profileBusy}
            errorMessage={profileError}
            onSave={(displayName, phone) => {
              void handleSaveProfile(displayName, phone)
            }}
          />
        </div>
      )}
    </section>
  )
}
