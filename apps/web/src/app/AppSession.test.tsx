import type {
  Order,
  PizzaConfiguration,
  UserLocation
} from '@pizzawise/shared'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSessionProvider, useAppSession } from './AppSession'
import type { ComparisonOutcome } from '../features/comparison/PizzaComparisonPanel'

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

const OUTCOME: ComparisonOutcome = {
  location: LOCATION,
  pizza: PIZZA,
  kind: 'success',
  ranked: [],
  uncheckedPizzeriaCount: 0
}

vi.mock('../features/account/auth-api', () => ({
  getCurrentUser: async () => USER
}))

afterEach(cleanup)

describe('AppSession order flow', () => {
  it('keeps checkout state when recording a placed order', async () => {
    render(
      <AppSessionProvider>
        <FlowProbe />
      </AppSessionProvider>
    )

    await screen.findByText('ready')
    expect(screen.getByTestId('pizza').textContent).toBe('yes')
    expect(screen.getByTestId('checkout').textContent).toBe('p2')
    expect(screen.getByTestId('last-order').textContent).toBe(ORDER.id)
    expect(screen.getByTestId('location').textContent).toBe('Tel Aviv')
    expect(screen.getByTestId('comparison').textContent).toBe('yes')
  })

  it('clears build location compare and checkout after resetOrderFlow', async () => {
    render(
      <AppSessionProvider>
        <FlowProbe resetAfterRecord />
      </AppSessionProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('pizza').textContent).toBe('no')
    })
    expect(screen.getByTestId('checkout').textContent).toBe('')
    expect(screen.getByTestId('location').textContent).toBe('')
    expect(screen.getByTestId('comparison').textContent).toBe('no')
    expect(screen.getByTestId('last-order').textContent).toBe(ORDER.id)
    expect(screen.getByTestId('favorite').textContent).toBe('no')
  })
})

function FlowProbe({
  resetAfterRecord = false
}: {
  readonly resetAfterRecord?: boolean
}) {
  const session = useAppSession()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (session.sessionStatus !== 'ready' || seeded) {
      return
    }

    session.setPizza(PIZZA)
    session.setLocation(LOCATION, 'Tel Aviv')
    session.setComparisonOutcome(OUTCOME)
    session.setCheckoutPizzeriaId('p2')
    session.loadFavorite(PIZZA)
    session.recordPlacedOrder(ORDER)
    if (resetAfterRecord) {
      session.resetOrderFlow()
    }
    setSeeded(true)
  }, [resetAfterRecord, seeded, session])

  if (!seeded) {
    return <p>seeding</p>
  }

  return (
    <div>
      <p>ready</p>
      <span data-testid="pizza">{session.pizza === null ? 'no' : 'yes'}</span>
      <span data-testid="checkout">{session.checkoutPizzeriaId ?? ''}</span>
      <span data-testid="location">{session.locationLabel ?? ''}</span>
      <span data-testid="comparison">
        {session.comparisonOutcome === null ? 'no' : 'yes'}
      </span>
      <span data-testid="last-order">{session.lastPlacedOrder?.id ?? ''}</span>
      <span data-testid="favorite">
        {session.loadedFavorite === null ? 'no' : 'yes'}
      </span>
    </div>
  )
}
