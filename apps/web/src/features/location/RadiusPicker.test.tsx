import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RadiusPicker } from './RadiusPicker'

afterEach(cleanup)

describe('RadiusPicker', () => {
  it('selects a search radius', () => {
    const onChange = vi.fn()

    render(<RadiusPicker radiusKm={5} onChange={onChange} />)

    expect((screen.getByLabelText('5 km') as HTMLInputElement).checked).toBe(true)

    fireEvent.click(screen.getByLabelText('10 km'))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('selects an unfiltered All radius', () => {
    const onChange = vi.fn()

    render(<RadiusPicker radiusKm={5} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('All'))
    expect(onChange).toHaveBeenCalledWith('all')
  })
})
