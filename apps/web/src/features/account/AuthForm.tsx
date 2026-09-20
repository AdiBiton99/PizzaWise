import { type FormEvent, useState } from 'react'
import { useTranslate, type MessageKey } from '../../i18n'
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
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
  const t = useTranslate()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationKey, setValidationKey] = useState<MessageKey | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const emailError = validateEmail(email)
    if (emailError !== null) {
      setValidationKey(emailError)
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError !== null) {
      setValidationKey(passwordError)
      return
    }

    setValidationKey(null)
    onSubmit(mode, normalizeEmailInput(email), password)
  }

  const alertMessage =
    validationKey === null
      ? errorMessage
      : validationKey === 'validation.passwordLength'
        ? t(validationKey, {
            min: MIN_PASSWORD_LENGTH,
            max: MAX_PASSWORD_LENGTH
          })
        : t(validationKey)

  return (
    <form className="account-form" noValidate onSubmit={handleSubmit}>
      <h3>{mode === 'login' ? t('auth.login') : t('auth.signup')}</h3>
      <p>{mode === 'login' ? t('auth.loginLead') : t('auth.signupLead')}</p>
      <div className="account-toggle" role="group" aria-label={t('auth.actionGroup')}>
        <button
          type="button"
          data-mode="login"
          aria-pressed={mode === 'login'}
          disabled={isBusy}
          onClick={() => setMode('login')}
        >
          {t('auth.login')}
        </button>
        <button
          type="button"
          data-mode="register"
          aria-pressed={mode === 'register'}
          disabled={isBusy}
          onClick={() => setMode('register')}
        >
          {t('auth.signup')}
        </button>
      </div>

      <label htmlFor="account-email">{t('auth.email')}</label>
      <input
        id="account-email"
        type="email"
        autoComplete="email"
        value={email}
        disabled={isBusy}
        onChange={(event) => setEmail(event.target.value)}
      />

      <label htmlFor="account-password">{t('auth.password')}</label>
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
          ? t('account.working')
          : mode === 'register'
            ? t('auth.create')
            : t('auth.login')}
      </button>

      {alertMessage !== null && <p role="alert">{alertMessage}</p>}
    </form>
  )
}
