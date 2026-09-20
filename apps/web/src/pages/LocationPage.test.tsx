import type { UserLocation } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppSessionProvider, useAppSession } from '../app/AppSession'
import { LocationPage } from './LocationPage'

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  createdAt: '2026-09-17T20:00:00.000Z'
}

const LOCATION: UserLocation = {
  latitude: 32.0809,
  longitude: 34.7806
}

vi.mock('../features/account/auth-api', () => ({
  getCurrentUser: async () => USER
}))

afterEach(cleanup)

describe('LocationPage', () => {
  it('changes radius without reopening location search', async () => {
    render(
      <AppSessionProvider>
        <SeededLocationPage />
      </AppSessionProvider>
    )

    expect((await screen.findByTestId('location')).textContent).toBe('Tel Aviv')
    expect(screen.queryByLabelText('City or address')).toBeNull()
    expect((screen.getByLabelText('5 km') as HTMLInputElement).checked).toBe(true)

    fireEvent.click(screen.getByLabelText('10 km'))

    expect(screen.getByTestId('radius').textContent).toBe('10')
    expect(screen.getByTestId('location').textContent).toBe('Tel Aviv')
    expect(screen.queryByLabelText('City or address')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Your location' })).toBeTruthy()
  })
})

function SeededLocationPage() {
  const session = useAppSession()
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    if (session.sessionStatus !== 'ready' || seeded) {
      return
    }

    session.setLocation(LOCATION, 'Tel Aviv')
    setSeeded(true)
  }, [seeded, session])

  if (!seeded) {
    return <p>seeding</p>
  }

  return (
    <MemoryRouter initialEntries={['/location']}>
      <Routes>
        <Route
          path="/location"
          element={
            <>
              <div data-testid="location">{session.locationLabel ?? ''}</div>
              <div data-testid="radius">{String(session.radiusKm)}</div>
              <LocationPage />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}
