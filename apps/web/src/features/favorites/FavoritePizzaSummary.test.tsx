import type { PizzaConfiguration } from '@pizzawise/shared'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createTranslate, LocaleProvider } from '../../i18n'
import { FavoritePizzaSummary } from './FavoritePizzaSummary'

afterEach(cleanup)

const BASE: PizzaConfiguration = {
  sizeTag: 'medium',
  crustTag: 'classic',
  sauceTag: 'tomato',
  toppingTags: []
}

describe('FavoritePizzaSummary', () => {
  it('shows size, crust, and sauce and omits an empty toppings line', () => {
    render(
      <FavoritePizzaSummary configuration={BASE} t={createTranslate('en')} />
    )

    expect(screen.getByText('Medium · Classic · Tomato')).toBeTruthy()
    expect(screen.queryByText('no toppings')).toBeNull()
  })

  it('lists every saved topping on its own line', () => {
    render(
      <FavoritePizzaSummary
        configuration={{
          ...BASE,
          toppingTags: ['mushroom', 'onion']
        }}
        t={createTranslate('en')}
      />
    )

    expect(screen.getByText('Medium · Classic · Tomato')).toBeTruthy()
    expect(screen.getByText('Mushroom · Onion')).toBeTruthy()
  })

  it('uses Hebrew option labels without changing tags', () => {
    render(
      <LocaleProvider>
        <FavoritePizzaSummary
          configuration={{
            ...BASE,
            toppingTags: ['mushroom']
          }}
          t={createTranslate('he')}
        />
      </LocaleProvider>
    )

    expect(screen.getByText('בינונית · קלאסי · עגבניות')).toBeTruthy()
    expect(screen.getByText('פטריות')).toBeTruthy()
  })
})
