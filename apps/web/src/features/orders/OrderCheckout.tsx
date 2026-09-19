import type {
  FulfillmentType,
  Order,
  PizzaConfiguration,
  PublicUser
} from '@pizzawise/shared'
import { type FormEvent, useEffect, useState } from 'react'
import { AccountRequestError } from '../account/auth-api'
import { validatePhone } from '../account/account-validation'
import {
  type GetProfile,
  getProfile as requestProfile
} from '../account/profile-api'
import { validateDeliveryAddress } from './order-validation'
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
      setErrorMessage(phoneError)
      return
    }

    if (fulfillmentType === 'delivery') {
      const addressError = validateDeliveryAddress(deliveryAddress)
      if (addressError !== null) {
        setErrorMessage(addressError)
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
          : 'Could not place the order.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className="account-form order-checkout"
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h4>Order from {pizzeriaName}</h4>

      <fieldset className="builder-options">
        <legend>Fulfillment</legend>
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
              Pickup
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
              Delivery
            </label>
          </li>
        </ul>
      </fieldset>

      <label htmlFor="order-phone">Phone</label>
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
          <label htmlFor="order-delivery-address">Delivery address</label>
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

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Placing order…' : 'Place order'}
      </button>

      {errorMessage !== null && <p role="alert">{errorMessage}</p>}
    </form>
  )
}
