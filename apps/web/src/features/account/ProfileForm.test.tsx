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
        'Save a phone number and optional default delivery address for checkout.'
      )
    ).toBeTruthy()
    expect(screen.queryByLabelText('Display name')).toBeNull()
    expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toBe('')
    expect(
      (screen.getByLabelText('Default delivery address') as HTMLInputElement).value
    ).toBe('')
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

    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: 'abc' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Phone is invalid')
  })

  it('saves a valid profile with an optional address', () => {
    const onSave = vi.fn()
    render(
      <ProfileForm
        profile={{
          userId: '11111111-1111-4111-8111-111111111111',
          phone: '0501234567',
          defaultDeliveryAddress: '10 Herzl St'
        }}
        isBusy={false}
        errorMessage={null}
        onSave={onSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(onSave).toHaveBeenCalledWith('0501234567', '10 Herzl St')
  })

  it('saves a blank address as null', () => {
    const onSave = vi.fn()
    render(
      <ProfileForm
        profile={{
          userId: '11111111-1111-4111-8111-111111111111',
          phone: '0501234567',
          defaultDeliveryAddress: '10 Herzl St'
        }}
        isBusy={false}
        errorMessage={null}
        onSave={onSave}
      />
    )

    fireEvent.change(screen.getByLabelText('Default delivery address'), {
      target: { value: '   ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(onSave).toHaveBeenCalledWith('0501234567', null)
  })
})
