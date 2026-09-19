import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { calculateDistanceKm } from '../../../src/domain/location/index.js'

describe('calculateDistanceKm', () => {
  test('calculates a known one-degree great-circle distance', () => {
    const distance = calculateDistanceKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 }
    )

    assert.ok(Math.abs(distance - 111.1950802335329) < 1e-9)
  })

  test('returns zero for identical coordinates', () => {
    const location = { latitude: 32.0809, longitude: 34.7806 }
    assert.equal(calculateDistanceKm(location, location), 0)
  })

  test('is symmetric', () => {
    const first = { latitude: 32.0809, longitude: 34.7806 }
    const second = { latitude: 31.7683, longitude: 35.2137 }

    assert.equal(
      calculateDistanceKm(first, second),
      calculateDistanceKm(second, first)
    )
  })

  test('preserves very small nonzero distances', () => {
    const distance = calculateDistanceKm(
      { latitude: 32.0809, longitude: 34.7806 },
      { latitude: 32.080901, longitude: 34.7806 }
    )

    assert.ok(distance > 0)
    assert.ok(distance < 0.001)
  })

  test('rejects invalid coordinates', () => {
    assert.throws(
      () =>
        calculateDistanceKm(
          { latitude: 91, longitude: 0 },
          { latitude: 0, longitude: 0 }
        ),
      RangeError
    )

    assert.throws(
      () =>
        calculateDistanceKm(
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: Number.NaN }
        ),
      RangeError
    )
  })
})
