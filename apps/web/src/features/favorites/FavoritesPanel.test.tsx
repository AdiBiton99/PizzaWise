import type { FavoritePizza, PizzaConfiguration, PublicUser } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FavoritesPanel } from './FavoritesPanel'
import { FavoritesRequestError } from './favorites-api'
import type {
  CreateFavorite,
  DeleteFavorite,
  ListFavorites,
  UpdateFavorite
} from './favorites-api'

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

const OTHER_PIZZA: PizzaConfiguration = {
  sizeTag: 'large',
  crustTag: 'thick',
  sauceTag: 'white',
  toppingTags: ['mushroom']
}

const FAVORITE: FavoritePizza = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Weeknight',
  configuration: PIZZA
}

describe('FavoritesPanel', () => {
  it('disables saving until a completed pizza exists', async () => {
    renderPanel({ pizza: null, listFavorites: async () => [] })

    expect(await screen.findByText('Complete a pizza to save it.')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Save current pizza' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it('saves the current pizza and lists the new favorite', async () => {
    const createFavorite = vi.fn(async () => FAVORITE)

    renderPanel({
      pizza: PIZZA,
      listFavorites: async () => [],
      createFavorite
    })

    await screen.findByText('No favorites yet.')
    fireEvent.change(screen.getByLabelText('Favorite name'), {
      target: { value: '  Weeknight  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save current pizza' }))

    expect(createFavorite).toHaveBeenCalledWith('Weeknight', PIZZA)
    expect(await screen.findByText('Weeknight')).toBeTruthy()
  })

  it('loads a favorite into the builder without waiting for another complete click', async () => {
    const onLoadFavorite = vi.fn()

    renderPanel({
      pizza: PIZZA,
      onLoadFavorite,
      listFavorites: async () => [FAVORITE]
    })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Use' }))

    expect(onLoadFavorite).toHaveBeenCalledWith(PIZZA)
  })

  it('renames a favorite without replacing its stored pizza', async () => {
    const updateFavorite = vi.fn(async (id, name, configuration) => ({
      id,
      name,
      configuration
    }))

    renderPanel({
      pizza: OTHER_PIZZA,
      listFavorites: async () => [FAVORITE],
      updateFavorite
    })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Friday' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateFavorite).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Friday', PIZZA)
    expect(await screen.findByText('Friday')).toBeTruthy()
  })

  it('replaces the stored pizza only when that option is chosen', async () => {
    const updateFavorite = vi.fn(async (id, name, configuration) => ({
      id,
      name,
      configuration
    }))

    renderPanel({
      pizza: OTHER_PIZZA,
      listFavorites: async () => [FAVORITE],
      updateFavorite
    })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByLabelText('Replace with current pizza'))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateFavorite).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'Weeknight',
      OTHER_PIZZA
    )
  })

  it('keeps replace disabled when there is no completed pizza', async () => {
    renderPanel({
      pizza: null,
      listFavorites: async () => [FAVORITE]
    })

    expect(await screen.findByText('Weeknight')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(
      (screen.getByLabelText('Replace with current pizza') as HTMLInputElement)
        .disabled
    ).toBe(true)
  })

  it('requires confirmation before deleting a favorite', async () => {
    const deleteFavorite = vi.fn(async () => undefined)

    renderPanel({
      pizza: PIZZA,
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
      pizza: PIZZA,
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
  readonly pizza: PizzaConfiguration | null
  readonly onUserChange?: (user: PublicUser | null) => void
  readonly onLoadFavorite?: (configuration: PizzaConfiguration) => void
  readonly listFavorites?: ListFavorites
  readonly createFavorite?: CreateFavorite
  readonly updateFavorite?: UpdateFavorite
  readonly deleteFavorite?: DeleteFavorite
}) {
  render(
    <FavoritesPanel
      user={USER}
      pizza={props.pizza}
      onUserChange={props.onUserChange ?? vi.fn()}
      onLoadFavorite={props.onLoadFavorite ?? vi.fn()}
      listFavorites={props.listFavorites ?? (async () => [])}
      createFavorite={props.createFavorite ?? vi.fn()}
      updateFavorite={props.updateFavorite ?? vi.fn()}
      deleteFavorite={props.deleteFavorite ?? vi.fn()}
    />
  )
}
