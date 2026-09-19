import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfileForm } from './ProfileForm'

afterEach(cleanup)

describe('ProfileForm', () => {
  it('shows an empty form when no profile exists yet', () => {
    render(
      <ProfileForm
        profile={null}
        isBusy={false}
        errorMessage={null}
        onSave={vi.fn()}
      />
    )

    expect(
      screen.getByText(
        'No profile saved yet. Add a display name and phone number.'
      )
    ).toBeTruthy()
    expect((screen.getByLabelText('Display name') as HTMLInputElement).value).toBe(
      ''
    )
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('')
  })

  it('validates the phone number before saving', () => {
    const onSave = vi.fn()
    render(
      <ProfileForm
        profile={null}
        isBusy={false}
        errorMessage={null}
        onSave={onSave}
      />
    )

    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: 'Ada' }
    })
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: 'abc' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Phone is invalid')
  })

  it('saves a valid profile', () => {
    const onSave = vi.fn()
    render(
      <ProfileForm
        profile={{
          userId: '11111111-1111-4111-8111-111111111111',
          displayName: 'Ada',
          phone: '0501234567'
        }}
        isBusy={false}
        errorMessage={null}
        onSave={onSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(onSave).toHaveBeenCalledWith('Ada', '0501234567')
  })
})
