import type { PizzaConfiguration, UserLocation } from '@pizzawise/shared'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComparePage } from './ComparePage'

const LOCATION: UserLocation = {
  latitude: 32.0809,
  longitude: 34.7806
}

const PIZZA: PizzaConfiguration = {
  sizeTag: 'medium',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['mushroom']
}

const session = vi.hoisted(() => ({
  user: null as { id: string; email: string; createdAt: string } | null,
  location: {
    latitude: 32.0809,
    longitude: 34.7806
  } as UserLocation | null,
  locationLabel: 'Dizengoff Street 100, Tel Aviv-Yafo, Israel' as string | null,
  pizza: {
    sizeTag: 'medium',
    crustTag: 'thin',
    sauceTag: 'tomato',
    toppingTags: ['mushroom']
  } as PizzaConfiguration | null,
  radiusKm: 5 as 5 | 10 | 15 | 25 | 50 | 'all',
  ranking: 'balanced' as const,
  comparisonOutcome: null,
  checkoutPizzeriaId: null,
  setRanking: vi.fn(),
  setComparisonOutcome: vi.fn(),
  setCheckoutPizzeriaId: vi.fn()
}))

vi.mock('../app/AppSession', () => ({
  useAppSession: () => session
}))

afterEach(() => {
  session.location = LOCATION
  session.locationLabel = 'Dizengoff Street 100, Tel Aviv-Yafo, Israel'
  session.pizza = PIZZA
  session.radiusKm = 5
  cleanup()
})

describe('ComparePage', () => {
  it('displays the selected location label in the search area summary', () => {
    render(
      <MemoryRouter>
        <ComparePage />
      </MemoryRouter>
    )

    expect(
      screen.getByText('Dizengoff Street 100, Tel Aviv-Yafo, Israel')
    ).toBeTruthy()
    expect(screen.getByText('Search radius: 5 km')).toBeTruthy()
    expect(screen.queryByText('Location selected')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'Change location' })
    ).toBeTruthy()
  })
})
