import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assertFavoriteBodyShape,
  FavoriteValidationError,
  MAX_FAVORITE_NAME_LENGTH,
  parseFavoriteInput
} from '../../src/favorites/favorite-fields.js'

const validBody = {
  name: '  Weeknight  ',
  sizeTag: 'medium',
  crustTag: 'thin',
  sauceTag: 'tomato',
  toppingTags: ['onion', 'mushroom']
}

test('parses a favorite and sorts topping tags deterministically', () => {
  assert.deepEqual(parseFavoriteInput(validBody), {
    name: 'Weeknight',
    configuration: {
      sizeTag: 'medium',
      crustTag: 'thin',
      sauceTag: 'tomato',
      toppingTags: ['mushroom', 'onion']
    }
  })
})

test('allows a favorite with no toppings', () => {
  assert.deepEqual(
    parseFavoriteInput({ ...validBody, name: 'Plain', toppingTags: [] })
      .configuration.toppingTags,
    []
  )
})

test('rejects extra keys, unknown tags, duplicates, and empty names', () => {
  assert.throws(
    () => assertFavoriteBodyShape({ ...validBody, pizzeriaId: 'x' }),
    FavoriteValidationError
  )
  assert.throws(
    () => parseFavoriteInput({ ...validBody, sizeTag: 'Large' }),
    FavoriteValidationError
  )
  assert.throws(
    () => parseFavoriteInput({
      ...validBody,
      toppingTags: ['mushroom', 'mushroom']
    }),
    FavoriteValidationError
  )
  assert.throws(
    () => parseFavoriteInput({ ...validBody, name: '   ' }),
    FavoriteValidationError
  )
  assert.throws(
    () => parseFavoriteInput({
      ...validBody,
      name: 'a'.repeat(MAX_FAVORITE_NAME_LENGTH + 1)
    }),
    FavoriteValidationError
  )
})
