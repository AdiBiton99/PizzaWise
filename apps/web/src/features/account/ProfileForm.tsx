import type { UserProfile } from '@pizzawise/shared'
import { type FormEvent, useState } from 'react'
import { validateDisplayName, validatePhone } from './account-validation'

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
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nameError = validateDisplayName(displayName)
    if (nameError !== null) {
      setValidationMessage(nameError)
      return
    }

    const phoneError = validatePhone(phone)
    if (phoneError !== null) {
      setValidationMessage(phoneError)
      return
    }

    setValidationMessage(null)
    onSave(displayName.trim(), phone)
  }

  const alertMessage = validationMessage ?? errorMessage

  return (
    <form className="account-form" noValidate onSubmit={handleSubmit}>
      <h3>Profile</h3>
      {profile === null && (
        <p>No profile saved yet. Add a display name and phone number.</p>
      )}

      <label htmlFor="profile-display-name">Display name</label>
      <input
        id="profile-display-name"
        type="text"
        maxLength={80}
        autoComplete="name"
        value={displayName}
        disabled={isBusy}
        onChange={(event) => setDisplayName(event.target.value)}
      />

      <label htmlFor="profile-phone">Phone</label>
      <input
        id="profile-phone"
        type="tel"
        autoComplete="tel"
        value={phone}
        disabled={isBusy}
        onChange={(event) => setPhone(event.target.value)}
      />

      <button type="submit" disabled={isBusy}>
        {isBusy ? 'Saving…' : 'Save profile'}
      </button>

      {alertMessage !== null && <p role="alert">{alertMessage}</p>}
    </form>
  )
}
