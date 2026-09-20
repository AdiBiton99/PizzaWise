import type {
  Order,
  PizzaConfiguration,
  RankedPizza,
  UserLocation
} from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter, Outlet, Route, Routes, useLocation, useParams } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSessionProvider, useAppSession } from '../app/AppSession'
import { OrdersRequestError } from '../features/orders/orders-api'
import { CheckoutPage } from './CheckoutPage'

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  createdAt: '2026-09-17T20:00:00.000Z'
}

const LOCATION: UserLocation = {
  latitude: 32.0809,
  longitude: 34.7806
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
  phone: '0501234567',
  fulfillmentType: 'pickup',
  deliveryAddress: null,
  status: 'placed',
  createdAt: '2026-09-17T21:00:00.000Z'
}

const RANKED: RankedPizza = {
  rank: 1,
  score: 0,
  costs: { price: 0, distance: 0, eta: 0 },
  nearby: {
    pizzeria: {
      id: 'p2',
      name: 'Funghi Bros',
      latitude: 32.0809,
      longitude: 34.7806,
      averageEta: { minMinutes: 12, maxMinutes: 20, minutes: 16 }
    },
    distanceKm: 1.23
  },
  selection: {
    size: {
      providerId: 'sz',
      providerName: 'Medium',
      semanticTag: 'medium',
      price: { amountMinor: 3390, currency: 'ILS' }
    },
    crust: {
      providerId: 'cr',
      providerName: 'Thin',
      semanticTag: 'thin',
      price: { amountMinor: 0, currency: 'ILS' }
    },
    sauce: {
      providerName: 'tomato',
      semanticTag: 'tomato'
    },
    toppings: []
  },
  total: { amountMinor: 3390, currency: 'ILS' }
}

const createOrder = vi.hoisted(() => vi.fn())

vi.mock('../features/account/auth-api', () => ({
  getCurrentUser: async () => USER
}))

vi.mock('../features/account/profile-api', () => ({
  getProfile: async () => null
}))

vi.mock('../features/orders/orders-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/orders/orders-api')>()
  return {
    ...actual,
    createOrder
  }
})

afterEach(() => {
  createOrder.mockReset()
  cleanup()
})

describe('CheckoutPage', () => {
  it('navigates to order confirmation after a successful place order', async () => {
    createOrder.mockResolvedValue(ORDER)
    renderCheckoutApp({ checkoutPizzeriaId: 'p2' })

    fireEvent.change(await screen.findByLabelText('Phone'), {
      target: { value: '0501234567' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    expect(
      await screen.findByText(`Order confirmation ${ORDER.id}`)
    ).toBeTruthy()
    expect(screen.queryByText('Compare page')).toBeNull()
    expect(screen.getByTestId('pathname').textContent).toBe(`/order/${ORDER.id}`)
  })

  it('redirects to compare when checkout has no selected pizzeria', async () => {
    renderCheckoutApp({ checkoutPizzeriaId: null })

    expect(await screen.findByText('Compare page')).toBeTruthy()
    expect(screen.getByTestId('pathname').textContent).toBe('/compare')
    expect(screen.queryByRole('button', { name: 'Place order' })).toBeNull()
  })

  it('stays on checkout when placing an order fails', async () => {
    createOrder.mockRejectedValue(
      new OrdersRequestError(
        'request-failed',
        'Pizzeria service unavailable'
      )
    )
    renderCheckoutApp({ checkoutPizzeriaId: 'p2' })

    fireEvent.change(await screen.findByLabelText('Phone'), {
      target: { value: '0501234567' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Pizzeria service unavailable'
    )
    expect(screen.getByTestId('pathname').textContent).toBe('/checkout')
    expect(screen.queryByText('Compare page')).toBeNull()
    expect(screen.queryByText(`Order confirmation ${ORDER.id}`)).toBeNull()
  })
})

function renderCheckoutApp (options: {
  readonly checkoutPizzeriaId: string | null
}) {
  render(
    <AppSessionProvider>
      <SeededRouter checkoutPizzeriaId={options.checkoutPizzeriaId} />
    </AppSessionProvider>
  )
}

function SeededRouter ({
  checkoutPizzeriaId
}: {
  readonly checkoutPizzeriaId: string | null
}) {
  const session = useAppSession()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (session.sessionStatus !== 'ready' || seeded) {
      return
    }

    session.setPizza(PIZZA)
    session.setLocation(LOCATION, 'Tel Aviv')
    session.setComparisonOutcome({
      location: LOCATION,
      pizza: PIZZA,
      kind: 'success',
      ranked: [RANKED],
      uncheckedPizzeriaCount: 0
    })
    session.setCheckoutPizzeriaId(checkoutPizzeriaId)
    setSeeded(true)
  }, [checkoutPizzeriaId, seeded, session])

  if (!seeded) {
    return <p>seeding</p>
  }

  return (
    <MemoryRouter initialEntries={['/checkout']}>
      <Routes>
        <Route element={<PathReporter />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/compare" element={<p>Compare page</p>} />
          <Route path="/order/:id" element={<ConfirmationProbe />} />
          <Route path="/account" element={<p>Account page</p>} />
          <Route path="/build" element={<p>Build page</p>} />
          <Route path="/location" element={<p>Location page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function PathReporter () {
  const location = useLocation()
  return (
    <>
      <div data-testid="pathname">{location.pathname}</div>
      <Outlet />
    </>
  )
}

function ConfirmationProbe () {
  const { id } = useParams<{ id: string }>()
  return <p>{`Order confirmation ${id}`}</p>
}
