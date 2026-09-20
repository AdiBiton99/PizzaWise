import type { FavoritePizza, PizzaConfiguration, UserLocation } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSessionProvider, useAppSession } from '../app/AppSession'
import { FavoritesPage } from './FavoritesPage'
import { BuildPage } from './BuildPage'

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

const FAVORITE: FavoritePizza = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Weeknight',
  configuration: PIZZA
}

vi.mock('../features/account/auth-api', () => ({
  getCurrentUser: async () => USER
}))

vi.mock('../features/favorites/favorites-api', () => ({
  FavoritesRequestError: class FavoritesRequestError extends Error {
    readonly code = 'request-failed'
  },
  listFavorites: async () => [FAVORITE],
  createFavorite: vi.fn(),
  updateFavorite: vi.fn(),
  deleteFavorite: vi.fn()
}))

afterEach(cleanup)

describe('FavoritesPage', () => {
  it('starts a blank pizza builder from Add pizza', async () => {
    renderFavoritesApp()

    fireEvent.click(await screen.findByRole('button', { name: 'Add pizza' }))

    expect(screen.getByTestId('pathname').textContent).toBe('/build')
    expect(await screen.findByRole('group', { name: 'Size' })).toBeTruthy()
    expect(screen.getByTestId('pizza').textContent).toBe('no')
    expect(screen.getByTestId('favorite').textContent).toBe('no')
    expect(screen.getByTestId('location').textContent).toBe('Tel Aviv')
  })
})

function renderFavoritesApp() {
  render(
    <AppSessionProvider>
      <SeededFavoritesRouter />
    </AppSessionProvider>
  )
}

function SeededFavoritesRouter() {
  const session = useAppSession()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (session.sessionStatus !== 'ready' || seeded) {
      return
    }

    session.setLocation(LOCATION, 'Tel Aviv')
    session.loadFavorite(PIZZA)
    setSeeded(true)
  }, [seeded, session])

  if (!seeded) {
    return <p>seeding</p>
  }

  return (
    <MemoryRouter initialEntries={['/favorites']}>
      <Routes>
        <Route element={<PathReporter />}>
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/build" element={<BuildPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

function PathReporter() {
  const location = useLocation()
  const session = useAppSession()

  return (
    <>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="pizza">{session.pizza === null ? 'no' : 'yes'}</div>
      <div data-testid="favorite">
        {session.loadedFavorite === null ? 'no' : 'yes'}
      </div>
      <div data-testid="location">{session.locationLabel ?? ''}</div>
      <Outlet />
    </>
  )
}
