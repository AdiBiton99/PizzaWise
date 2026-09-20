import type { Order, PizzaConfiguration, PublicUser } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrderHistoryPanel } from './OrderHistoryPanel'
import { OrdersRequestError } from './orders-api'
import type { GetOrder, ListOrders } from './orders-api'

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

const NEWER: Order = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  pizzeriaId: 'p3',
  pizzeriaName: 'New Slice',
  configuration: PIZZA,
  total: { amountMinor: 2000, currency: 'ILS' },
  phone: '0501234567',
  fulfillmentType: 'delivery',
  deliveryAddress: '10 Herzl St',
  status: 'placed',
  createdAt: '2026-09-17T22:00:00.000Z'
}

const OLDER: Order = {
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

describe('OrderHistoryPanel', () => {
  it('shows an empty history', async () => {
    renderPanel({ listOrders: async () => [] })

    expect(await screen.findByText('No orders yet.')).toBeTruthy()
  })

  it('renders stored snapshots newest first without changing the API order', async () => {
    renderPanel({ listOrders: async () => [NEWER, OLDER] })

    expect(await screen.findByText('New Slice')).toBeTruthy()
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'New Slice',
      'Funghi Bros'
    ])
    expect(screen.getByText('20.00 ILS')).toBeTruthy()
    expect(screen.getByText('17.50 ILS')).toBeTruthy()
    expect(screen.queryByText(/UTC/)).toBeNull()
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('placed')).toHaveLength(2)
    expect(screen.getByText('Delivery')).toBeTruthy()
    expect(screen.getByText('Pickup')).toBeTruthy()
  })

  it('prepends a newly placed order without refetching the list', async () => {
    const listOrders = vi.fn(async () => [OLDER])
    const onUserChange = vi.fn()
    const { rerender } = renderPanel({
      lastPlacedOrder: null,
      listOrders,
      onUserChange
    })

    expect(await screen.findByText('Funghi Bros')).toBeTruthy()
    expect(listOrders).toHaveBeenCalledOnce()

    rerender(
      <OrderHistoryPanel
        user={USER}
        lastPlacedOrder={NEWER}
        onUserChange={onUserChange}
        listOrders={listOrders}
        getOrder={vi.fn()}
      />
    )

    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'New Slice',
      'Funghi Bros'
    ])
    expect(listOrders).toHaveBeenCalledOnce()
  })

  it('deduplicates a placed order that is already in the list', async () => {
    const listOrders = vi.fn(async () => [NEWER, OLDER])
    const onUserChange = vi.fn()
    const { rerender } = renderPanel({
      lastPlacedOrder: null,
      listOrders,
      onUserChange
    })

    expect(await screen.findByText('New Slice')).toBeTruthy()

    rerender(
      <OrderHistoryPanel
        user={USER}
        lastPlacedOrder={NEWER}
        onUserChange={onUserChange}
        listOrders={listOrders}
        getOrder={vi.fn()}
      />
    )

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
  })

  it('loads full details from GET /api/orders/:id', async () => {
    const getOrder = vi.fn(async () => ({
      ...OLDER,
      phone: '0509999999'
    }))

    renderPanel({
      listOrders: async () => [OLDER],
      getOrder
    })

    fireEvent.click(await screen.findByRole('button', { name: 'View details' }))

    expect(getOrder).toHaveBeenCalledWith(OLDER.id)
    expect(await screen.findByText('Order details')).toBeTruthy()
    expect(screen.getByText('0509999999')).toBeTruthy()
    expect(screen.queryByText('Loading order…')).toBeNull()
  })

  it('shows a 404 when the stored order cannot be found', async () => {
    renderPanel({
      listOrders: async () => [OLDER],
      getOrder: async () => {
        throw new OrdersRequestError('not-found', 'Order not found')
      }
    })

    fireEvent.click(await screen.findByRole('button', { name: 'View details' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Order not found'
    )
  })

  it('signs the user out when the list request is unauthorized', async () => {
    const onUserChange = vi.fn()

    renderPanel({
      onUserChange,
      listOrders: async () => {
        throw new OrdersRequestError('unauthorized', 'Authentication required')
      }
    })

    await waitFor(() => {
      expect(onUserChange).toHaveBeenCalledWith(null)
    })
  })

  it('retries a failed list request', async () => {
    const listOrders = vi
      .fn()
      .mockRejectedValueOnce(
        new OrdersRequestError('request-failed', 'Could not load orders.')
      )
      .mockResolvedValueOnce([])

    renderPanel({ listOrders })

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not load orders.'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No orders yet.')).toBeTruthy()
    expect(listOrders).toHaveBeenCalledTimes(2)
  })
})

function renderPanel (props: {
  readonly lastPlacedOrder?: Order | null
  readonly onUserChange?: (user: PublicUser | null) => void
  readonly listOrders?: ListOrders
  readonly getOrder?: GetOrder
}) {
  const view = render(
    <OrderHistoryPanel
      user={USER}
      lastPlacedOrder={props.lastPlacedOrder ?? null}
      onUserChange={props.onUserChange ?? vi.fn()}
      listOrders={props.listOrders ?? (async () => [])}
      getOrder={props.getOrder ?? vi.fn()}
    />
  )

  return view
}
