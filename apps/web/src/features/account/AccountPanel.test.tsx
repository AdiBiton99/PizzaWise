import type { PublicUser, UserProfile } from '@pizzawise/shared'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountPanel } from './AccountPanel'
import type { GetCurrentUser, LoginUser, LogoutUser, RegisterUser } from './auth-api'
import type { GetProfile, SaveProfile } from './profile-api'

afterEach(cleanup)

const USER: PublicUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  createdAt: '2026-09-17T20:00:00.000Z'
}

const PROFILE: UserProfile = {
  userId: USER.id,
  phone: '0501234567',
  defaultDeliveryAddress: '10 Herzl St'
}

describe('AccountPanel', () => {
  it('restores a signed-out session without treating 401 as an error', async () => {
    const onUserChange = vi.fn()

    renderPanel({
      onUserChange,
      getCurrentUser: async () => null,
      getProfile: vi.fn()
    })

    expect(screen.getByText('Checking account…')).toBeTruthy()
    expect(await screen.findByLabelText('Email')).toBeTruthy()
    expect(onUserChange).toHaveBeenCalledWith(null)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('loads a signed-in user and an empty profile after 404', async () => {
    const onUserChange = vi.fn()
    const getProfile = vi.fn(async () => null)

    renderPanel({
      onUserChange,
      getCurrentUser: async () => USER,
      getProfile
    })

    expect(await screen.findByText('user@example.com')).toBeTruthy()
    expect(getProfile).toHaveBeenCalledOnce()
    expect(
      screen.getByText(
        'Save a phone number and optional default delivery address for checkout.'
      )
    ).toBeTruthy()
    expect(onUserChange).toHaveBeenCalledWith(USER)
  })

  it('saves a profile for the signed-in user', async () => {
    const saveProfile = vi.fn(async () => PROFILE)

    renderPanel({
      getCurrentUser: async () => USER,
      getProfile: async () => null,
      saveProfile
    })

    await screen.findByText('user@example.com')
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '050 123-4567' }
    })
    fireEvent.change(screen.getByLabelText('Default delivery address'), {
      target: { value: '10 Herzl St' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(saveProfile).toHaveBeenCalledWith('050 123-4567', '10 Herzl St')
    expect(await screen.findByDisplayValue('0501234567')).toBeTruthy()
  })

  it('logs the user out without requiring location or pizza state', async () => {
    const onUserChange = vi.fn()
    const logoutUser = vi.fn(async () => undefined)

    renderPanel({
      initialUser: USER,
      onUserChange,
      getCurrentUser: async () => USER,
      getProfile: async () => PROFILE,
      logoutUser
    })

    await screen.findByText('user@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByLabelText('Email')).toBeTruthy()
    expect(logoutUser).toHaveBeenCalledOnce()
    expect(onUserChange).toHaveBeenLastCalledWith(null)
  })

  it('shows a retry action when session restore fails', async () => {
    renderPanel({
      getCurrentUser: async () => {
        throw new Error('offline')
      }
    })

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not restore the current session.'
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('registers and then loads the profile', async () => {
    const onUserChange = vi.fn()
    const registerUser = vi.fn(async () => USER)
    const getProfile = vi.fn(async () => null)

    renderPanel({
      onUserChange,
      getCurrentUser: async () => null,
      registerUser,
      getProfile
    })

    await screen.findByLabelText('Email')
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' }
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password1' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('user@example.com')).toBeTruthy()
    expect(registerUser).toHaveBeenCalledWith('user@example.com', 'password1')
    expect(getProfile).toHaveBeenCalledOnce()
    expect(onUserChange).toHaveBeenCalledWith(USER)
  })

  it('logs in and then loads the profile', async () => {
    const onUserChange = vi.fn()
    const loginUser = vi.fn(async () => USER)
    const getProfile = vi.fn(async () => PROFILE)

    renderPanel({
      onUserChange,
      getCurrentUser: async () => null,
      loginUser,
      getProfile
    })

    await screen.findByLabelText('Email')
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' }
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password1' }
    })
    const loginButtons = screen.getAllByRole('button', { name: 'Log in' })
    fireEvent.click(loginButtons[loginButtons.length - 1] as HTMLElement)

    expect(await screen.findByText('user@example.com')).toBeTruthy()
    expect(loginUser).toHaveBeenCalledWith('user@example.com', 'password1')
    expect(getProfile).toHaveBeenCalledOnce()
    expect(onUserChange).toHaveBeenCalledWith(USER)
    expect(screen.getByDisplayValue('0501234567')).toBeTruthy()
    expect(screen.getByDisplayValue('10 Herzl St')).toBeTruthy()
    expect(screen.queryByLabelText('Display name')).toBeNull()
  })
})

function renderPanel (props: {
  readonly initialUser?: PublicUser | null
  readonly onUserChange?: (user: PublicUser | null) => void
  readonly getCurrentUser?: GetCurrentUser
  readonly registerUser?: RegisterUser
  readonly loginUser?: LoginUser
  readonly logoutUser?: LogoutUser
  readonly getProfile?: GetProfile
  readonly saveProfile?: SaveProfile
}) {
  function Harness() {
    const [user, setUser] = useState<PublicUser | null>(props.initialUser ?? null)

    return (
      <AccountPanel
        user={user}
        onUserChange={(nextUser) => {
          setUser(nextUser)
          props.onUserChange?.(nextUser)
        }}
        getCurrentUser={props.getCurrentUser}
        registerUser={props.registerUser}
        loginUser={props.loginUser}
        logoutUser={props.logoutUser}
        getProfile={props.getProfile}
        saveProfile={props.saveProfile}
      />
    )
  }

  return render(<Harness />)
}
