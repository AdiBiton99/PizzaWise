import type { Order, PizzaConfiguration, PublicUser, UserProfile } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountRequestError } from '../account/auth-api'
import { OrderCheckout } from './OrderCheckout'
import type { CreateOrder } from './orders-api'
import { OrdersRequestError } from './orders-api'

afterEach(cleanup)

const USER: PublicUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  createdAt: '2026-09-17T20:00:00.000Z'
}

const PROFILE: UserProfile = {
  userId: USER.id,
  phone: '0501234567',
  defaultDeliveryAddress: '10 Herzl St'
}

const PIZZA: PizzaConfiguration = {
  sizeTag: 'medium',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: []
}

const ORDER: Order = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  pizzeriaId: 'p2',
  pizzeriaName: 'Funghi Bros',
  configuration: PIZZA,
  total: { amountMinor: 1750, currency: 'ILS' },
  phone: '0509999999',
  fulfillmentType: 'pickup',
  deliveryAddress: null,
  status: 'placed',
  createdAt: '2026-09-17T21:00:00.000Z'
}

describe('OrderCheckout', () => {
  it('prefills phone and address from profile without saving the profile', async () => {
    const getProfile = vi.fn(async () => PROFILE)
    const createOrder = vi.fn(async () => ORDER)
    const onOrderPlaced = vi.fn()

    renderCheckout({ getProfile, createOrder, onOrderPlaced })

    expect(await screen.findByDisplayValue('0501234567')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Delivery'))
    expect(screen.getByDisplayValue('10 Herzl St')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Delivery address'), {
      target: { value: '  12 Allenby  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith({
        pizzeriaId: 'p2',
        configuration: PIZZA,
        phone: '0501234567',
        fulfillmentType: 'delivery',
        deliveryAddress: '12 Allenby'
      })
    })
    expect(getProfile).toHaveBeenCalledOnce()
    expect(onOrderPlaced).toHaveBeenCalled()
  })

  it('leaves required fields empty and disables Place order when the profile is missing', async () => {
    renderCheckout({ getProfile: async () => null })

    await waitFor(() => {
      expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('')
    })
    expect(
      (screen.getByRole('button', { name: 'Place order' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)

    fireEvent.click(screen.getByLabelText('Delivery'))
    expect(
      (screen.getByRole('button', { name: 'Place order' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it('keeps checkout usable when profile loading fails', async () => {
    const onUserChange = vi.fn()

    renderCheckout({
      onUserChange,
      getProfile: async () => {
        throw new AccountRequestError('request-failed', 'offline')
      }
    })

    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: 'Place order' }) as HTMLButtonElement)
          .disabled
      ).toBe(true)
    })
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('')
    expect(onUserChange).not.toHaveBeenCalled()
  })

  it('signs the user out when profile restore is unauthorized', async () => {
    const onUserChange = vi.fn()

    renderCheckout({
      onUserChange,
      getProfile: async () => {
        throw new AccountRequestError('unauthorized', 'Authentication required')
      }
    })

    await waitFor(() => {
      expect(onUserChange).toHaveBeenCalledWith(null)
    })
  })

  it('sends a trimmed delivery address and omits it for pickup', async () => {
    const createOrder = vi.fn(async () => ({
      ...ORDER,
      fulfillmentType: 'delivery' as const,
      deliveryAddress: '10 Herzl St'
    }))

    renderCheckout({ getProfile: async () => null, createOrder })

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '0501234567' }
    })
    fireEvent.click(screen.getByLabelText('Delivery'))
    fireEvent.change(screen.getByLabelText('Delivery address'), {
      target: { value: '  10 Herzl St  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith({
        pizzeriaId: 'p2',
        configuration: PIZZA,
        phone: '0501234567',
        fulfillmentType: 'delivery',
        deliveryAddress: '10 Herzl St'
      })
    })
  })

  it('shows a conflict when the live menu cannot match', async () => {
    renderCheckout({
      getProfile: async () => null,
      createOrder: async () => {
        throw new OrdersRequestError(
          'conflict',
          'Pizza is not available at this pizzeria'
        )
      }
    })

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '0501234567' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Pizza is not available at this pizzeria'
    )
  })

  it('shows a live menu failure without treating it as a conflict', async () => {
    renderCheckout({
      getProfile: async () => null,
      createOrder: async () => {
        throw new OrdersRequestError(
          'request-failed',
          'Pizzeria service unavailable'
        )
      }
    })

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '0501234567' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Pizzeria service unavailable'
    )
    expect(
      screen.queryByText('Pizza is not available at this pizzeria')
    ).toBeNull()
  })

  it('signs the user out when placing an order is unauthorized', async () => {
    const onUserChange = vi.fn()

    renderCheckout({
      onUserChange,
      getProfile: async () => null,
      createOrder: async () => {
        throw new OrdersRequestError('unauthorized', 'Authentication required')
      }
    })

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '0501234567' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await waitFor(() => {
      expect(onUserChange).toHaveBeenCalledWith(null)
    })
  })
})

function renderCheckout (props: {
  readonly onUserChange?: (user: PublicUser | null) => void
  readonly onOrderPlaced?: (order: Order) => void
  readonly getProfile?: () => Promise<UserProfile | null>
  readonly createOrder?: CreateOrder
}) {
  render(
    <OrderCheckout
      user={USER}
      pizzeriaId="p2"
      pizzeriaName="Funghi Bros"
      pizza={PIZZA}
      onUserChange={props.onUserChange ?? vi.fn()}
      onOrderPlaced={props.onOrderPlaced ?? vi.fn()}
      getProfile={props.getProfile ?? (async () => null)}
      createOrder={props.createOrder}
    />
  )
}
