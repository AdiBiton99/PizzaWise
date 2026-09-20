import type { UserProfile } from '@pizzawise/shared'
import { type FormEvent, useState } from 'react'
import { useTranslate, type MessageKey } from '../../i18n'
import {
  MAX_DISPLAY_NAME_LENGTH,
  MIN_DISPLAY_NAME_LENGTH,
  validateDisplayName,
  validatePhone
} from './account-validation'

interface ProfileFormProps {
  readonly profile: UserProfile | null
  readonly isBusy: boolean
  readonly errorMessage: string | null
  readonly onSave: (displayName: string, phone: string) => void
}

export function ProfileForm({
  profile,
  isBusy,
  errorMessage,
  onSave
}: ProfileFormProps) {
  const t = useTranslate()
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [validationKey, setValidationKey] = useState<MessageKey | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nameError = validateDisplayName(displayName)
    if (nameError !== null) {
      setValidationKey(nameError)
      return
    }

    const phoneError = validatePhone(phone)
    if (phoneError !== null) {
      setValidationKey(phoneError)
      return
    }

    setValidationKey(null)
    onSave(displayName.trim(), phone)
  }

  const alertMessage =
    validationKey === null
      ? errorMessage
      : validationKey === 'validation.displayNameLength'
        ? t(validationKey, {
            min: MIN_DISPLAY_NAME_LENGTH,
            max: MAX_DISPLAY_NAME_LENGTH
          })
        : t(validationKey)

  return (
    <form className="account-form" noValidate onSubmit={handleSubmit}>
      <h3>{t('profile.heading')}</h3>
      {profile === null && <p>{t('profile.empty')}</p>}

      <label htmlFor="profile-display-name">{t('profile.displayName')}</label>
      <input
        id="profile-display-name"
        type="text"
        maxLength={80}
        autoComplete="name"
        value={displayName}
        disabled={isBusy}
        onChange={(event) => setDisplayName(event.target.value)}
      />

      <label htmlFor="profile-phone">{t('profile.phone')}</label>
      <input
        id="profile-phone"
        type="tel"
        autoComplete="tel"
        value={phone}
        disabled={isBusy}
        onChange={(event) => setPhone(event.target.value)}
      />

      <button type="submit" disabled={isBusy}>
        {isBusy ? t('profile.saving') : t('profile.save')}
      </button>

      {alertMessage !== null && <p role="alert">{alertMessage}</p>}
    </form>
  )
}
