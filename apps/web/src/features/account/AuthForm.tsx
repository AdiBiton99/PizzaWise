import { type FormEvent, useState } from 'react'
import {
  normalizeEmailInput,
  validateEmail,
  validatePassword
} from './account-validation'

export type AuthMode = 'register' | 'login'

interface AuthFormProps {
  readonly isBusy: boolean
  readonly errorMessage: string | null
  readonly initialMode?: AuthMode
  readonly onSubmit: (mode: AuthMode, email: string, password: string) => void
}

export function AuthForm({
  isBusy,
  errorMessage,
  initialMode = 'register',
  onSubmit
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const emailError = validateEmail(email)
    if (emailError !== null) {
      setValidationMessage(emailError)
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError !== null) {
      setValidationMessage(passwordError)
      return
    }

    setValidationMessage(null)
    onSubmit(mode, normalizeEmailInput(email), password)
  }

  const alertMessage = validationMessage ?? errorMessage

  return (
    <form className="account-form" noValidate onSubmit={handleSubmit}>
      <h3>{mode === 'login' ? 'Log in' : 'Sign up'}</h3>
      <p>
        {mode === 'login'
          ? 'Welcome back. Use the account you already created.'
          : 'Create an account to save favorites and place orders.'}
      </p>
      <div className="account-toggle" role="group" aria-label="Account action">
        <button
          type="button"
          data-mode="login"
          aria-pressed={mode === 'login'}
          disabled={isBusy}
          onClick={() => setMode('login')}
        >
          Log in
        </button>
        <button
          type="button"
          data-mode="register"
          aria-pressed={mode === 'register'}
          disabled={isBusy}
          onClick={() => setMode('register')}
        >
          Sign up
        </button>
      </div>

      <label htmlFor="account-email">Email</label>
      <input
        id="account-email"
        type="email"
        autoComplete="email"
        value={email}
        disabled={isBusy}
        onChange={(event) => setEmail(event.target.value)}
      />

      <label htmlFor="account-password">Password</label>
      <input
        id="account-password"
        type="password"
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        value={password}
        disabled={isBusy}
        onChange={(event) => setPassword(event.target.value)}
      />

      <button type="submit" disabled={isBusy}>
        {isBusy
          ? 'Working…'
          : mode === 'register'
            ? 'Create account'
            : 'Log in'}
      </button>

      {alertMessage !== null && <p role="alert">{alertMessage}</p>}
    </form>
  )
}
