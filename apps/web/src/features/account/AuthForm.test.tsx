import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthForm } from './AuthForm'

afterEach(cleanup)

describe('AuthForm', () => {
  it('validates email before submitting', () => {
    const onSubmit = vi.fn()
    render(<AuthForm isBusy={false} errorMessage={null} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'not-an-email' }
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password1' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Email is invalid')
  })

  it('submits register by default and login after toggling', () => {
    const onSubmit = vi.fn()
    render(<AuthForm isBusy={false} errorMessage={null} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: '  User@Example.COM  ' }
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password1' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(onSubmit).toHaveBeenCalledWith(
      'register',
      'user@example.com',
      'password1'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    const loginButtons = screen.getAllByRole('button', { name: 'Log in' })
    fireEvent.click(loginButtons[loginButtons.length - 1]!)

    expect(onSubmit).toHaveBeenLastCalledWith(
      'login',
      'user@example.com',
      'password1'
    )
  })
})
