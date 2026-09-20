import type { PizzaComparison, PizzaConfiguration, RankedPizza, UserLocation } from '@pizzawise/shared'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PizzaComparisonPanel } from './PizzaComparisonPanel'

afterEach(cleanup)

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

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  createdAt: '2026-09-17T20:00:00.000Z'
}

describe('PizzaComparisonPanel', () => {
  it('keeps Compare disabled until both location and pizza are present', () => {
    const { rerender } = render(
      <PizzaComparisonPanel user={null} location={null} pizza={null} comparePizzas={vi.fn()} />
    )

    expect(
      (screen.getByRole('button', { name: 'Compare' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect(
      screen.getByText('Select a location and complete a pizza to compare.')
    ).toBeTruthy()

    rerender(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={null}
        comparePizzas={vi.fn()}
      />
    )
    expect(
      (screen.getByRole('button', { name: 'Compare' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect(screen.getByText('Complete a pizza to compare.')).toBeTruthy()

    rerender(
      <PizzaComparisonPanel
        user={null}
        location={null}
        pizza={PIZZA}
        comparePizzas={vi.fn()}
      />
    )
    expect(
      (screen.getByRole('button', { name: 'Compare' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect(screen.getByText('Select a location to compare.')).toBeTruthy()
  })

  it('sends the selected radius and omits balanced priority', async () => {
    const comparePizzas = vi.fn(async () => ({
      ranked: [],
      uncheckedPizzeriaCount: 0
    }))

    render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        radiusKm={10}
        comparePizzas={comparePizzas}
      />
    )

    expect((screen.getByLabelText('Best overall') as HTMLInputElement).checked).toBe(
      true
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(comparePizzas).toHaveBeenCalledWith({
      location: LOCATION,
      radiusKm: 10,
      configuration: PIZZA
    })
    expect(
      screen.getByText(
        'No nearby pizzeria could match this pizza. Try a larger search radius or change the pizza configuration.'
      )
    ).toBeTruthy()
  })

  it('omits radiusKm when searching All pizzerias', async () => {
    const comparePizzas = vi.fn(async () => ({
      ranked: [],
      uncheckedPizzeriaCount: 0
    }))

    render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        radiusKm="all"
        comparePizzas={comparePizzas}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(comparePizzas).toHaveBeenCalledWith({
      location: LOCATION,
      configuration: PIZZA
    })
  })

  it('warns when some nearby pizzerias could not be checked', async () => {
    render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        comparePizzas={async () => ({
          ranked: [rankedPizza()],
          uncheckedPizzeriaCount: 2
        })}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))

    expect(
      await screen.findByText(
        'Some nearby pizzerias could not be checked. Try Compare again.'
      )
    ).toBeTruthy()
    expect(screen.getByText('1. Funghi Bros')).toBeTruthy()
    expect(screen.getByText('Top match')).toBeTruthy()
    expect(screen.queryByText('No matching pizzas nearby.')).toBeNull()
    expect(
      screen.queryByText(/No nearby pizzeria could match this pizza/)
    ).toBeNull()
  })

  it('does not treat an incomplete empty ranking as no nearby matches', async () => {
    render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        comparePizzas={async () => ({
          ranked: [],
          uncheckedPizzeriaCount: 1
        })}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))

    expect(
      await screen.findByText(
        'Some nearby pizzerias could not be checked, so we could not finish this comparison.'
      )
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry comparison' })).toBeTruthy()
    expect(screen.queryByText('No matching pizzas nearby.')).toBeNull()
    expect(
      screen.queryByText(/No nearby pizzeria could match this pizza/)
    ).toBeNull()
  })

  it('sends an explicit ranking priority', async () => {
    const comparePizzas = vi.fn(async () => ({
      ranked: [],
      uncheckedPizzeriaCount: 0
    }))

    render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        comparePizzas={comparePizzas}
      />
    )

    fireEvent.click(screen.getByLabelText('Lowest price'))
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(comparePizzas).toHaveBeenCalledWith({
      location: LOCATION,
      radiusKm: 5,
      configuration: PIZZA,
      priority: 'price'
    })
  })

  it('shows ranked pizzerias from the API response', async () => {
    const comparison: PizzaComparison = {
      ranked: [rankedPizza()],
      uncheckedPizzeriaCount: 0
    }

    render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        comparePizzas={async () => comparison}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))

    expect(await screen.findByText('1. Funghi Bros')).toBeTruthy()
    expect(screen.getByText('33.90 ILS')).toBeTruthy()
    expect(screen.getByText('1.2 km')).toBeTruthy()
    expect(screen.getByText('12–20 min')).toBeTruthy()
    expect(screen.getByText('Sign in to order.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Order from / })).toBeNull()
  })

  it('chooses a ranked pizzeria for checkout', async () => {
    const onChoosePizzeria = vi.fn()
    const second = rankedPizza()
    const other: RankedPizza = {
      ...second,
      rank: 2,
      nearby: {
        ...second.nearby,
        pizzeria: {
          ...second.nearby.pizzeria,
          id: 'p3',
          name: 'Other Slice'
        }
      }
    }

    render(
      <PizzaComparisonPanel
        user={USER}
        location={LOCATION}
        pizza={PIZZA}
        comparePizzas={async () => ({
          ranked: [rankedPizza(), other],
          uncheckedPizzeriaCount: 0
        })}
        onChoosePizzeria={onChoosePizzeria}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))
    expect(await screen.findByText('1. Funghi Bros')).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Order from Funghi Bros' })
    )
    expect(onChoosePizzeria).toHaveBeenCalledWith('p2')

    fireEvent.click(
      screen.getByRole('button', { name: 'Order from Other Slice' })
    )
    expect(onChoosePizzeria).toHaveBeenCalledWith('p3')
  })

  it('shows a loading state and then an error', async () => {
    let rejectComparison: ((error: Error) => void) | undefined
    const comparePizzas = vi.fn(
      async () =>
        await new Promise<PizzaComparison>((_resolve, reject) => {
          rejectComparison = reject
        })
    )

    render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        comparePizzas={comparePizzas}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))

    expect(
      (screen.getByRole('button', { name: 'Comparing…' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
    expect(screen.getByText('Comparing nearby pizzerias…')).toBeTruthy()

    await act(async () => {
      rejectComparison?.(new Error('nope'))
    })

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Comparison failed. Please try again.'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry comparison' }))

    expect(comparePizzas).toHaveBeenCalledTimes(2)
    expect(
      (screen.getByRole('button', { name: 'Comparing…' }) as HTMLButtonElement)
        .disabled
    ).toBe(true)
  })

  it('clears results when the completed pizza is invalidated', async () => {
    const { rerender } = render(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={PIZZA}
        comparePizzas={async () => ({
          ranked: [rankedPizza()],
          uncheckedPizzeriaCount: 0
        })}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Compare' }))
    expect(await screen.findByText('1. Funghi Bros')).toBeTruthy()

    rerender(
      <PizzaComparisonPanel
        user={null}
        location={LOCATION}
        pizza={null}
        comparePizzas={vi.fn()}
      />
    )

    expect(screen.queryByText('1. Funghi Bros')).toBeNull()
    expect(
      (screen.getByRole('button', { name: 'Compare' }) as HTMLButtonElement).disabled
    ).toBe(true)
  })
})

function rankedPizza (): RankedPizza {
  return {
    rank: 1,
    score: 0,
    costs: {
      price: 0,
      distance: 0,
      eta: 0
    },
    nearby: {
      pizzeria: {
        id: 'p2',
        name: 'Funghi Bros',
        latitude: 32.0809,
        longitude: 34.7806,
        averageEta: {
          minMinutes: 12,
          maxMinutes: 20,
          minutes: 16
        }
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
    total: {
      amountMinor: 3390,
      currency: 'ILS'
    }
  }
}
