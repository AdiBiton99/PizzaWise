import type { FavoritePizza, PizzaConfiguration, PublicUser } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FavoritesPanel } from './FavoritesPanel'
import { FavoritesRequestError } from './favorites-api'
import type { DeleteFavorite, ListFavorites } from './favorites-api'

afterEach(cleanup)

const USER: PublicUser = {
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

describe('FavoritesPanel', () => {
  it('lists saved favorites without an inline save or replace form', async () => {
    renderPanel({ listFavorites: async () => [FAVORITE] })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    expect(screen.getByText('Medium · Thin · Tomato')).toBeTruthy()
    expect(screen.queryByLabelText('Favorite name')).toBeNull()
    expect(screen.queryByLabelText('Replace with current pizza')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Save current pizza' })).toBeNull()
  })

  it('loads a favorite into the order builder', async () => {
    const onLoadFavorite = vi.fn()

    renderPanel({
      onLoadFavorite,
      listFavorites: async () => [FAVORITE]
    })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Use' }))

    expect(onLoadFavorite).toHaveBeenCalledWith(PIZZA)
  })

  it('opens the favorite editor from Edit', async () => {
    const onEditFavorite = vi.fn()

    renderPanel({
      onEditFavorite,
      listFavorites: async () => [FAVORITE]
    })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(onEditFavorite).toHaveBeenCalledWith(FAVORITE)
    expect(screen.queryByLabelText('Replace with current pizza')).toBeNull()
  })

  it('requires confirmation before deleting a favorite', async () => {
    const deleteFavorite = vi.fn(async () => undefined)

    renderPanel({
      listFavorites: async () => [FAVORITE],
      deleteFavorite
    })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(deleteFavorite).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(deleteFavorite).toHaveBeenCalledWith(FAVORITE.id)
    expect(await screen.findByText('No favorites yet.')).toBeTruthy()
  })

  it('signs the user out when the favorites request is unauthorized', async () => {
    const onUserChange = vi.fn()

    renderPanel({
      onUserChange,
      listFavorites: async () => {
        throw new FavoritesRequestError('unauthorized', 'Authentication required')
      }
    })

    expect(await screen.findByText('Favorites')).toBeTruthy()
    await waitFor(() => {
      expect(onUserChange).toHaveBeenCalledWith(null)
    })
  })
})

function renderPanel (props: {
  readonly onUserChange?: (user: PublicUser | null) => void
  readonly onLoadFavorite?: (configuration: PizzaConfiguration) => void
  readonly onEditFavorite?: (favorite: FavoritePizza) => void
  readonly listFavorites?: ListFavorites
  readonly deleteFavorite?: DeleteFavorite
}) {
  render(
    <FavoritesPanel
      user={USER}
      onUserChange={props.onUserChange ?? vi.fn()}
      onLoadFavorite={props.onLoadFavorite ?? vi.fn()}
      onEditFavorite={props.onEditFavorite ?? vi.fn()}
      listFavorites={props.listFavorites ?? (async () => [])}
      deleteFavorite={props.deleteFavorite ?? vi.fn()}
    />
  )
}
