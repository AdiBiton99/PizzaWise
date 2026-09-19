import type { Pizzeria } from '@pizzawise/shared'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  calculateDistanceKm,
  findNearbyPizzerias
} from '../../../src/domain/location/index.js'

const ORIGIN = { latitude: 0, longitude: 0 }

describe('findNearbyPizzerias', () => {
  test('includes the radius boundary and excludes values beyond it', () => {
    const candidate = pizzeria('p1', 0, 1)
    const distance = calculateDistanceKm(ORIGIN, {
      latitude: candidate.latitude,
      longitude: candidate.longitude
    })

    assert.equal(
      findNearbyPizzerias(ORIGIN, [candidate], distance).length,
      1
    )
    assert.equal(
      findNearbyPizzerias(ORIGIN, [candidate], distance - 1e-9).length,
      0
    )
  })

  test('sorts by distance with deterministic pizzeria-ID ties', () => {
    const results = findNearbyPizzerias(
      ORIGIN,
      [
        pizzeria('p2', 0, 1),
        pizzeria('p3', 0, 0.5),
        pizzeria('p1', 0, 1)
      ],
      200
    )

    assert.deepEqual(
      results.map(({ pizzeria }) => pizzeria.id),
      ['p3', 'p1', 'p2']
    )
    assert.ok(results[0]!.distanceKm < results[1]!.distanceKm)
  })

  test('supports a zero radius for exact-coordinate matches', () => {
    const results = findNearbyPizzerias(
      ORIGIN,
      [pizzeria('same', 0, 0), pizzeria('other', 0, 0.000001)],
      0
    )

    assert.deepEqual(
      results.map(({ pizzeria }) => pizzeria.id),
      ['same']
    )
    assert.equal(results[0]?.distanceKm, 0)
  })

  test('includes every pizzeria when no radius is provided', () => {
    const results = findNearbyPizzerias(ORIGIN, [
      pizzeria('far', 10, 10),
      pizzeria('near', 0, 0)
    ])

    assert.deepEqual(
      results.map(({ pizzeria }) => pizzeria.id),
      ['near', 'far']
    )
  })

  test('returns an empty list for empty or out-of-radius inputs', () => {
    assert.deepEqual(findNearbyPizzerias(ORIGIN, [], 5), [])
    assert.deepEqual(
      findNearbyPizzerias(ORIGIN, [pizzeria('far', 10, 10)], 5),
      []
    )
  })

  test('rejects invalid radii and canonical pizzeria coordinates', () => {
    assert.throws(
      () => findNearbyPizzerias(ORIGIN, [], -1),
      RangeError
    )
    assert.throws(
      () =>
        findNearbyPizzerias(
          ORIGIN,
          [pizzeria('invalid', 95, 10)],
          100
        ),
      RangeError
    )
  })
})

function pizzeria (
  id: string,
  latitude: number,
  longitude: number
): Pizzeria {
  return {
    id,
    name: id,
    latitude,
    longitude,
    averageEta: null
  }
}
