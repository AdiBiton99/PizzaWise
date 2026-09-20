import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PizzaBuilder } from './PizzaBuilder'

afterEach(cleanup)

describe('PizzaBuilder', () => {
  it('keeps Continue disabled until a size is selected', () => {
    render(<PizzaBuilder onConfigurationCompleted={vi.fn()} />)

    expect(
      (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled
    ).toBe(true)

    fireEvent.click(screen.getByLabelText('Medium'))

    expect(
      (screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled
    ).toBe(false)
  })

  it('uses human-friendly labels and semantic tags internally', () => {
    render(<PizzaBuilder onConfigurationCompleted={vi.fn()} />)

    const medium = screen.getByLabelText('Medium') as HTMLInputElement
    expect(medium.value).toBe('medium')
    expect(screen.queryByText('extra-large')).toBeNull()
    expect(screen.getByLabelText('Extra Large')).toBeTruthy()
  })

  it('allows completing a pizza with no toppings', () => {
    const onConfigurationCompleted = vi.fn()

    render(<PizzaBuilder onConfigurationCompleted={onConfigurationCompleted} />)

    completeThroughSauce()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onConfigurationCompleted).toHaveBeenCalledWith({
      sizeTag: 'medium',
      crustTag: 'thin',
      sauceTag: 'tomato',
      toppingTags: []
    })
    expect(screen.getByText('Your pizza')).toBeTruthy()
    expect(screen.getByText('None')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Compare' })).toBeNull()
  })

  it('keeps later selections when going back', () => {
    const onConfigurationCompleted = vi.fn()

    render(<PizzaBuilder onConfigurationCompleted={onConfigurationCompleted} />)

    completeThroughSauce()
    fireEvent.click(screen.getByLabelText('Mushroom'))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect((screen.getByLabelText('Mushroom') as HTMLInputElement).checked).toBe(
      true
    )

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onConfigurationCompleted).toHaveBeenCalledWith({
      sizeTag: 'medium',
      crustTag: 'thin',
      sauceTag: 'tomato',
      toppingTags: ['mushroom']
    })
  })

  it('opens on a completed summary when given an initial configuration', () => {
    const onConfigurationCompleted = vi.fn()

    render(
      <PizzaBuilder
        initialConfiguration={{
          sizeTag: 'medium',
          crustTag: 'thin',
          sauceTag: 'tomato',
          toppingTags: ['mushroom']
        }}
        onConfigurationCompleted={onConfigurationCompleted}
      />
    )

    expect(screen.getByText('Your pizza')).toBeTruthy()
    expect(screen.getByText('Mushroom')).toBeTruthy()
    expect(onConfigurationCompleted).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(onConfigurationCompleted).toHaveBeenCalledWith(null)
    expect(screen.getByLabelText('Mushroom')).toBeTruthy()
  })

  it('invalidates the completed pizza when going back to edit', () => {
    const onConfigurationCompleted = vi.fn()

    render(<PizzaBuilder onConfigurationCompleted={onConfigurationCompleted} />)

    completeThroughSauce()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onConfigurationCompleted).toHaveBeenLastCalledWith({
      sizeTag: 'medium',
      crustTag: 'thin',
      sauceTag: 'tomato',
      toppingTags: []
    })

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(onConfigurationCompleted).toHaveBeenLastCalledWith(null)
    expect(screen.getByLabelText('Mushroom')).toBeTruthy()
  })

  it('does not make steps clickable in the guided new-pizza flow', () => {
    render(<PizzaBuilder onConfigurationCompleted={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Size' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ready' })).toBeNull()
    expect(screen.getByRole('list', { name: 'Builder steps' })).toBeTruthy()
  })

  it('jumps between completed steps while editing without losing selections', () => {
    const onConfigurationCompleted = vi.fn()
    const pizza = {
      sizeTag: 'medium' as const,
      crustTag: 'thin' as const,
      sauceTag: 'tomato' as const,
      toppingTags: ['mushroom']
    }

    render(
      <PizzaBuilder
        initialConfiguration={pizza}
        allowStepNavigation
        onConfigurationCompleted={onConfigurationCompleted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Size' }))
    expect((screen.getByLabelText('Medium') as HTMLInputElement).checked).toBe(true)
    expect(onConfigurationCompleted).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Toppings' }))
    expect((screen.getByLabelText('Mushroom') as HTMLInputElement).checked).toBe(
      true
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(screen.getByText('Your pizza')).toBeTruthy()
    expect(screen.getByText('Mushroom')).toBeTruthy()
    expect(onConfigurationCompleted).toHaveBeenCalledWith(pizza)
  })
})

function completeThroughSauce() {
  fireEvent.click(screen.getByLabelText('Medium'))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByLabelText('Thin'))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByLabelText('Tomato'))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
}
