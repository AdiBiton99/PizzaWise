import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppHeader } from '../app/AppLayout'
import { HomePage } from '../pages/HomePage'
import { en, he } from './messages'
import {
  LOCALE_STORAGE_KEY,
  LocaleProvider
} from './index'

vi.mock('../app/AppSession', () => ({
  useAppSession: () => ({ user: null })
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
})

beforeEach(() => {
  localStorage.clear()
  document.documentElement.lang = 'en'
  document.documentElement.dir = 'ltr'
})

describe('localization', () => {
  it('defaults to English LTR and switches the app to Hebrew RTL', () => {
    render(
      <LocaleProvider>
        <MemoryRouter>
          <AppHeader />
          <HomePage />
        </MemoryRouter>
      </LocaleProvider>
    )

    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        name: 'Your perfect pizza is closer than you think.'
      })
    ).toBeTruthy()
    expect(screen.getByText('Neighborhood pizza, made easy')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'HE' }))

    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('he')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('he')
    expect(screen.getByRole('link', { name: 'בית' })).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        name: 'בונים את הפיצה שלכם ומשווים בין הפיצריות באזור'
      })
    ).toBeTruthy()
    expect(
      screen.getByText(
        'בחרו גודל, בצק, רוטב ותוספות — ואנחנו נשווה עבורכם מחירים, מרחקים וזמני משלוח.'
      )
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'בואו נבנה פיצה' })).toBeTruthy()
    expect(screen.queryByText('פיצה מהשכונה, בלי כאב ראש')).toBeNull()
    expect(screen.getByRole('heading', { name: 'איך PizzaWise עובדת' })).toBeTruthy()
    expect(screen.queryByText(/פיצהוויז/)).toBeNull()
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('banner').getAttribute('dir')).toBe('ltr')
  })

  it('persists the selected language across remounts', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'he')

    const view = render(
      <LocaleProvider>
        <MemoryRouter>
          <AppHeader />
        </MemoryRouter>
      </LocaleProvider>
    )

    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('link', { name: 'בית' })).toBeTruthy()

    view.unmount()
    cleanup()

    render(
      <LocaleProvider>
        <MemoryRouter>
          <AppHeader />
        </MemoryRouter>
      </LocaleProvider>
    )

    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('link', { name: 'בית' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(document.documentElement.dir).toBe('ltr')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
  })

  it('uses pizza wording instead of pie in English copy', () => {
    expect(en['compare.title']).toBe('Compare nearby pizzas')
    expect(en['favorites.eyebrow']).toBe('Saved pizzas')
    expect(JSON.stringify(en)).not.toMatch(/\bpie[s]?\b/i)
  })

  it('keeps the PizzaWise brand name untranslated in Hebrew copy', () => {
    for (const text of Object.values(he)) {
      expect(text).not.toMatch(/פיצהוויז/)
    }
    expect(he['home.how']).toContain('PizzaWise')
    expect(he['account.titleGuest']).toContain('PizzaWise')
  })
})
