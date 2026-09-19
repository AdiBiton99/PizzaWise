import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  DatabaseConfigError,
  loadDatabaseConfig
} from '../../src/db/index.js'

describe('loadDatabaseConfig', () => {
  test('loads a mysql DATABASE_URL', () => {
    assert.deepEqual(
      loadDatabaseConfig({
        DATABASE_URL: 'mysql://pizzawise:secret-password@127.0.0.1:3306/pizzawise'
      }),
      {
        url: 'mysql://pizzawise:secret-password@127.0.0.1:3306/pizzawise'
      }
    )
  })

  test('accepts the mysql2 protocol', () => {
    assert.equal(
      loadDatabaseConfig({
        DATABASE_URL: 'mysql2://pizzawise:secret-password@127.0.0.1:3306/pizzawise'
      }).url,
      'mysql2://pizzawise:secret-password@127.0.0.1:3306/pizzawise'
    )
  })

  test('rejects missing or invalid configuration without exposing the password', () => {
    assert.throws(
      () => loadDatabaseConfig({}),
      /DATABASE_URL must be configured/
    )

    assert.throws(
      () => loadDatabaseConfig({ DATABASE_URL: '' }),
      /DATABASE_URL must be configured/
    )

    assert.throws(
      () =>
        loadDatabaseConfig({
          DATABASE_URL: 'not-a-url'
        }),
      (error) => {
        assert.ok(error instanceof DatabaseConfigError)
        assert.doesNotMatch(error.message, /secret-password/)
        return true
      }
    )

    assert.throws(
      () =>
        loadDatabaseConfig({
          DATABASE_URL: 'postgres://pizzawise:secret-password@127.0.0.1:5432/pizzawise'
        }),
      (error) => {
        assert.ok(error instanceof DatabaseConfigError)
        assert.match(error.message, /mysql or mysql2/)
        assert.doesNotMatch(error.message, /secret-password/)
        return true
      }
    )
  })
})
