import type { FavoritePizza, PizzaConfiguration } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSessionProvider } from '../app/AppSession'
import { FavoriteComposePage } from './FavoriteComposePage'

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  createdAt: '2026-09-17T20:00:00.000Z'
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

const createFavorite = vi.hoisted(() => vi.fn())
const updateFavorite = vi.hoisted(() => vi.fn())
const listFavorites = vi.hoisted(() => vi.fn())

vi.mock('../features/account/auth-api', () => ({
  getCurrentUser: async () => USER
}))

vi.mock('../features/favorites/favorites-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../features/favorites/favorites-api')>()
  return {
    ...actual,
    createFavorite,
    updateFavorite,
    listFavorites
  }
})

afterEach(() => {
  createFavorite.mockReset()
  updateFavorite.mockReset()
  listFavorites.mockReset()
  cleanup()
})

describe('FavoriteComposePage', () => {
  it('saves a newly built pizza as a favorite and returns to the list', async () => {
    createFavorite.mockResolvedValue(FAVORITE)
    renderCompose('/favorites/new')

    expect(await screen.findByRole('heading', { name: 'Add a favorite' })).toBeTruthy()
    expect(screen.queryByLabelText('Favorite name')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Continue to location' })).toBeNull()

    completeBlankPizza()
    fireEvent.change(await screen.findByLabelText('Favorite name'), {
      target: { value: '  Weeknight  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save favorite' }))

    await waitFor(() => {
      expect(createFavorite).toHaveBeenCalledWith('Weeknight', PIZZA)
    })
    expect(await screen.findByText('favorites-list')).toBeTruthy()
  })

  it('saves name and pizza changes for an existing favorite', async () => {
    listFavorites.mockResolvedValue([FAVORITE])
    updateFavorite.mockResolvedValue({
      ...FAVORITE,
      name: 'Friday'
    })
    renderCompose(`/favorites/${FAVORITE.id}/edit`)

    expect(await screen.findByDisplayValue('Weeknight')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your pizza' })).toBeTruthy()
    expect(screen.queryByLabelText('Replace with current pizza')).toBeNull()

    fireEvent.change(screen.getByLabelText('Favorite name'), {
      target: { value: 'Friday' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateFavorite).toHaveBeenCalledWith(FAVORITE.id, 'Friday', PIZZA)
    })
    expect(await screen.findByText('favorites-list')).toBeTruthy()
  })
})

function renderCompose (path: string) {
  render(
    <AppSessionProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/favorites/new" element={<FavoriteComposePage />} />
          <Route path="/favorites/:id/edit" element={<FavoriteComposePage />} />
          <Route path="/favorites" element={<p>favorites-list</p>} />
        </Routes>
      </MemoryRouter>
    </AppSessionProvider>
  )
}

function completeBlankPizza() {
  fireEvent.click(screen.getByLabelText('Medium'))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByLabelText('Thin'))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByLabelText('Tomato'))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
}
