import type { UserProfile } from '@pizzawise/shared'
import { type FormEvent, useState } from 'react'
import { useTranslate, type MessageKey } from '../../i18n'
import { validatePhone } from './account-validation'
import {
  MAX_DELIVERY_ADDRESS_LENGTH,
  validateDeliveryAddress
} from '../orders/order-validation'

interface ProfileFormProps {
  readonly profile: UserProfile | null
  readonly isBusy: boolean
  readonly errorMessage: string | null
  readonly onSave: (phone: string, defaultDeliveryAddress: string | null) => void
}

export function ProfileForm({
  profile,
  isBusy,
  errorMessage,
  onSave
}: ProfileFormProps) {
  const t = useTranslate()
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [defaultDeliveryAddress, setDefaultDeliveryAddress] = useState(
    profile?.defaultDeliveryAddress ?? ''
  )
  const [validationKey, setValidationKey] = useState<MessageKey | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const phoneError = validatePhone(phone)
    if (phoneError !== null) {
      setValidationKey(phoneError)
      return
    }

    const trimmedAddress = defaultDeliveryAddress.trim()
    if (trimmedAddress.length > 0) {
      const addressError = validateDeliveryAddress(trimmedAddress)
      if (addressError !== null) {
        setValidationKey(addressError)
        return
      }
    }

    setValidationKey(null)
    onSave(phone, trimmedAddress.length === 0 ? null : trimmedAddress)
  }

  const alertMessage =
    validationKey === null
      ? errorMessage
      : validationKey === 'validation.deliveryLength'
        ? t(validationKey, { max: MAX_DELIVERY_ADDRESS_LENGTH })
        : t(validationKey)

  return (
    <form className="account-form" noValidate onSubmit={handleSubmit}>
      <h3>{t('profile.heading')}</h3>
      {profile === null && <p>{t('profile.empty')}</p>}

      <label htmlFor="profile-phone">{t('profile.phone')}</label>
      <input
        id="profile-phone"
        type="tel"
        autoComplete="tel"
        value={phone}
        disabled={isBusy}
        onChange={(event) => setPhone(event.target.value)}
      />

      <label htmlFor="profile-delivery-address">{t('profile.address')}</label>
      <input
        id="profile-delivery-address"
        type="text"
        maxLength={200}
        autoComplete="street-address"
        value={defaultDeliveryAddress}
        disabled={isBusy}
        onChange={(event) => setDefaultDeliveryAddress(event.target.value)}
      />

      <button type="submit" disabled={isBusy}>
        {isBusy ? t('profile.saving') : t('profile.save')}
      </button>

      {alertMessage !== null && <p role="alert">{alertMessage}</p>}
    </form>
  )
}
