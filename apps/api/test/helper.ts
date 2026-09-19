// This file contains code that we reuse between our tests.
import helper from 'fastify-cli/helper.js'
import * as test from 'node:test'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryFavoriteStore } from '../src/favorites/memory-favorite-store.js'
import { MemoryOrderStore } from '../src/orders/memory-order-store.js'
import { MemoryProfileStore } from '../src/profiles/memory-profile-store.js'
import { MemorySessionStore } from '../src/auth/memory-session-store.js'
import { MemoryUserStore } from '../src/auth/memory-user-store.js'
import type { AppOptions } from '../src/app.js'
import { createServerObservabilityOptions } from '../src/observability.js'
import type { Database } from '../src/db/index.js'
import type { GeocodingProvider } from '../src/domain/geocoding/index.js'
import type { PizzeriaApiClientContract } from '../src/plugins/pizzeria-api-client.js'

export type TestContext = {
  after: typeof test.after
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const AppPath = path.join(__dirname, '..', 'src', 'app.ts')

const unusedDatabase = {} as Database

const unusedGeocodingProvider: GeocodingProvider = {
  async search () {
    throw new Error('Unexpected geocoding provider call in test')
  }
}

const unusedPizzeriaApiClient: PizzeriaApiClientContract = {
  async getPizzerias () {
    throw new Error('Unexpected Pizzeria API call in test')
  },
  async getMenu () {
    throw new Error('Unexpected Pizzeria API call in test')
  }
}

// Fill in this config with all the configurations
// needed for testing the application
function config (options: AppOptions = {}) {
  return {
    skipOverride: true, // Register our application with fastify-plugin
    db: unusedDatabase,
    userStore: new MemoryUserStore(),
    sessionStore: new MemorySessionStore(),
    profileStore: new MemoryProfileStore(),
    favoriteStore: new MemoryFavoriteStore(),
    orderStore: new MemoryOrderStore(),
    geocodingProvider: unusedGeocodingProvider,
    pizzeriaApiClient: unusedPizzeriaApiClient,
    ...options
  }
}

// Automatically build and tear down our instance
async function build (t: TestContext, options: AppOptions = {}) {
  // you can set all the options supported by the fastify CLI command
  const argv = [AppPath]

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  const app = await helper.build(
    argv,
    config(options),
    createServerObservabilityOptions({ LOG_LEVEL: 'silent' })
  )

  // Tear down our app after we are done
  // eslint-disable-next-line no-void
  t.after(() => void app.close())

  return app
}

export {
  config,
  build
}
