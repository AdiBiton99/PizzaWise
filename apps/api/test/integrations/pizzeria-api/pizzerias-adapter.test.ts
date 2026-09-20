import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  normalizeEta,
  normalizePizzeriasResponse,
  PizzeriaApiAdapterError
} from '../../../src/integrations/pizzeria-api/index.js'

describe('normalizeEta', () => {
  test('normalizes a numeric ETA to equal bounds and ranking minutes', () => {
    assert.deepEqual(normalizeEta(30), {
      minMinutes: 30,
      maxMinutes: 30,
      minutes: 30
    })
  })

  test('normalizes an ETA range and uses the midpoint for ranking', () => {
    assert.deepEqual(normalizeEta('40-50'), {
      minMinutes: 40,
      maxMinutes: 50,
      minutes: 45
    })
  })

  test('preserves an unknown ETA as null', () => {
    assert.equal(normalizeEta(null), null)
  })

  test('rejects malformed and reversed ETA ranges', () => {
    assert.throws(() => normalizeEta('about 40'), PizzeriaApiAdapterError)
    assert.throws(() => normalizeEta('50-40'), PizzeriaApiAdapterError)
  })
})

describe('normalizePizzeriasResponse', () => {
  test('normalizes the external pizzeria list', () => {
    const result = normalizePizzeriasResponse({
      count: 1,
      pizzerias: [
        {
          id: 'p2',
          name: 'Funghi Bros',
          lat: 32.0809,
          lng: 34.7806,
          avgEtaMinutes: 40
        }
      ]
    })

    assert.deepEqual(result, [
      {
        id: 'p2',
        name: 'Funghi Bros',
        latitude: 32.0809,
        longitude: 34.7806,
        averageEta: {
          minMinutes: 40,
          maxMinutes: 40,
          minutes: 40
        }
      }
    ])
  })

  test('rejects a count that does not match the list', () => {
    assert.throws(
      () => normalizePizzeriasResponse({ count: 1, pizzerias: [] }),
      /Pizzeria count mismatch/
    )
  })

  test('rejects malformed pizzeria data', () => {
    assert.throws(
      () =>
        normalizePizzeriasResponse({
          count: 1,
          pizzerias: [
            {
              id: 'p2',
              name: 'Funghi Bros',
              lat: '32.0809',
              lng: 34.7806,
              avgEtaMinutes: 40
            }
          ]
        }),
      PizzeriaApiAdapterError
    )
  })
})
