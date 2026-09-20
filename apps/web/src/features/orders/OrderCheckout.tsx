import type {
  FulfillmentType,
  Order,
  PizzaConfiguration,
  PublicUser
} from '@pizzawise/shared'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslate } from '../../i18n'
import { AccountRequestError } from '../account/auth-api'
import { validatePhone } from '../account/account-validation'
import {
  type GetProfile,
  getProfile as requestProfile
} from '../account/profile-api'
import {
  MAX_DELIVERY_ADDRESS_LENGTH,
  validateDeliveryAddress
} from './order-validation'
import {
  type CreateOrder,
  OrdersRequestError,
  createOrder as requestCreate
} from './orders-api'

interface OrderCheckoutProps {
  readonly user: PublicUser
  readonly pizzeriaId: string
  readonly pizzeriaName: string
  readonly pizza: PizzaConfiguration
  readonly onUserChange: (user: PublicUser | null) => void
  readonly onOrderPlaced: (order: Order) => void
  readonly getProfile?: GetProfile
  readonly createOrder?: CreateOrder
}

export function OrderCheckout({
  user,
  pizzeriaId,
  pizzeriaName,
  pizza,
  onUserChange,
  onOrderPlaced,
  getProfile = requestProfile,
  createOrder = requestCreate
}: OrderCheckoutProps) {
  const t = useTranslate()
  const [phone, setPhone] = useState('')
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentType>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const profile = await getProfile()
        if (cancelled || profile === null) {
          return
        }

        setPhone((current) => (current === '' ? profile.phone : current))
        setDeliveryAddress((current) =>
          current === '' ? (profile.defaultDeliveryAddress ?? '') : current
        )
      } catch (error) {
        if (cancelled) {
          return
        }

        if (
          error instanceof AccountRequestError &&
          error.code === 'unauthorized'
        ) {
          onUserChange(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [getProfile, onUserChange, user.id])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const phoneError = validatePhone(phone)
    if (phoneError !== null) {
      setErrorMessage(t(phoneError))
      return
    }

    if (fulfillmentType === 'delivery') {
      const addressError = validateDeliveryAddress(deliveryAddress)
      if (addressError !== null) {
        setErrorMessage(
          addressError === 'validation.deliveryLength'
            ? t(addressError, { max: MAX_DELIVERY_ADDRESS_LENGTH })
            : t(addressError)
        )
        return
      }
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const order = await createOrder({
        pizzeriaId,
        configuration: pizza,
        phone,
        fulfillmentType,
        ...(fulfillmentType === 'delivery'
          ? { deliveryAddress: deliveryAddress.trim() }
          : {})
      })
      onOrderPlaced(order)
    } catch (error) {
      if (error instanceof OrdersRequestError && error.code === 'unauthorized') {
        onUserChange(null)
        return
      }

      setErrorMessage(
        error instanceof OrdersRequestError
          ? error.message
          : t('checkout.failed')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const canPlaceOrder =
    validatePhone(phone) === null &&
    (fulfillmentType === 'pickup' ||
      validateDeliveryAddress(deliveryAddress) === null)

  return (
    <form
      className="account-form order-checkout"
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h4>{t('checkout.title', { name: pizzeriaName })}</h4>

      <fieldset className="builder-options">
        <legend>{t('checkout.fulfillment')}</legend>
        <ul>
          <li>
            <label>
              <input
                type="radio"
                name="fulfillment-type"
                value="pickup"
                checked={fulfillmentType === 'pickup'}
                disabled={isSubmitting}
                onChange={() => setFulfillmentType('pickup')}
              />
              {t('checkout.pickup')}
            </label>
          </li>
          <li>
            <label>
              <input
                type="radio"
                name="fulfillment-type"
                value="delivery"
                checked={fulfillmentType === 'delivery'}
                disabled={isSubmitting}
                onChange={() => setFulfillmentType('delivery')}
              />
              {t('checkout.delivery')}
            </label>
          </li>
        </ul>
      </fieldset>

      <label htmlFor="order-phone">{t('checkout.phone')}</label>
      <input
        id="order-phone"
        type="tel"
        autoComplete="tel"
        value={phone}
        disabled={isSubmitting}
        onChange={(event) => setPhone(event.target.value)}
      />

      {fulfillmentType === 'delivery' && (
        <>
          <label htmlFor="order-delivery-address">{t('checkout.address')}</label>
          <input
            id="order-delivery-address"
            type="text"
            maxLength={200}
            autoComplete="street-address"
            value={deliveryAddress}
            disabled={isSubmitting}
            onChange={(event) => setDeliveryAddress(event.target.value)}
          />
        </>
      )}

      <button type="submit" disabled={isSubmitting || !canPlaceOrder}>
        {isSubmitting ? t('checkout.placing') : t('checkout.place')}
      </button>

      {errorMessage !== null && <p role="alert">{errorMessage}</p>}
    </form>
  )
}
