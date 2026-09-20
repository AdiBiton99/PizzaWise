import type {
  Order,
  PizzaConfiguration,
  RankedPizza,
  UserLocation
} from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSessionProvider, useAppSession } from '../app/AppSession'
import { OrderConfirmationPage } from './OrderConfirmationPage'

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

const createFavorite = vi.hoisted(() => vi.fn())

vi.mock('../features/account/auth-api', () => ({
  getCurrentUser: async () => USER
}))

vi.mock('../features/favorites/favorites-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../features/favorites/favorites-api')>()
  return {
    ...actual,
    createFavorite
  }
})

afterEach(() => {
  createFavorite.mockReset()
  cleanup()
})

describe('OrderConfirmationPage', () => {
  it('resets the order flow only after the placed order is shown', async () => {
    renderConfirmationApp()

    expect(await screen.findByRole('heading', { name: 'Order placed' })).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByTestId('pizza').textContent).toBe('no')
    })
    expect(screen.getByTestId('checkout').textContent).toBe('')
    expect(screen.getByTestId('location').textContent).toBe('')
    expect(screen.getByTestId('last-order').textContent).toBe(ORDER.id)
  })

  it('saves the placed order pizza to favorites', async () => {
    createFavorite.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Friday',
      configuration: PIZZA
    })
    renderConfirmationApp()

    fireEvent.change(await screen.findByLabelText('Favorite name'), {
      target: { value: '  Friday  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save favorite' }))

    expect(createFavorite).toHaveBeenCalledWith('Friday', PIZZA)
    expect(await screen.findByText('Saved to favorites.')).toBeTruthy()
  })
})

function renderConfirmationApp() {
  render(
    <AppSessionProvider>
      <SeededConfirmationRouter />
    </AppSessionProvider>
  )
}

function SeededConfirmationRouter() {
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
    session.setCheckoutPizzeriaId('p2')
    session.recordPlacedOrder(ORDER)
    setSeeded(true)
  }, [seeded, session])

  if (!seeded) {
    return <p>seeding</p>
  }

  return (
    <MemoryRouter initialEntries={[`/order/${ORDER.id}`]}>
      <Routes>
        <Route element={<SessionReporter />}>
          <Route path="/order/:id" element={<OrderConfirmationPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function SessionReporter() {
  const session = useAppSession()
  return (
    <>
      <div data-testid="pizza">{session.pizza === null ? 'no' : 'yes'}</div>
      <div data-testid="checkout">{session.checkoutPizzeriaId ?? ''}</div>
      <div data-testid="location">{session.locationLabel ?? ''}</div>
      <div data-testid="last-order">{session.lastPlacedOrder?.id ?? ''}</div>
      <Outlet />
    </>
  )
}
