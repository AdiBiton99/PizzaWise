import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { test } from 'node:test'
import type { Menu, Pizzeria } from '@pizzawise/shared'
import menuCacheWarmer from '../../src/plugins/menu-cache-warmer.js'
import pizzeriaApiClient from '../../src/plugins/pizzeria-api-client.js'
import { build } from '../helper.js'

test('does not warm menus during inject-based startup', async (t) => {
  let pizzeriaCalls = 0
  const app = await build(t, {
    pizzeriaApiClient: {
      async getPizzerias () {
        pizzeriaCalls += 1
        return []
      },
      async getMenu () {
        pizzeriaCalls += 1
        throw new Error('Unexpected menu call')
      }
    }
  })

  const health = await app.inject({ method: 'GET', url: '/health' })
  assert.equal(health.statusCode, 200)
  assert.equal(pizzeriaCalls, 0)
})

test('starts warming after listen and stops the interval on close', async () => {
  let pizzeriaCalls = 0
  const app = Fastify({ logger: false })
  await app.register(pizzeriaApiClient, {
    pizzeriaApiClient: {
      async getPizzerias () {
        pizzeriaCalls += 1
        return [pizzeria('p1')]
      },
      async getMenu (id) {
        return menu(id)
      }
    }
  })
  await app.register(menuCacheWarmer)
  await app.listen({ port: 0, host: '127.0.0.1' })

  await waitUntil(() => pizzeriaCalls >= 1)
  await app.close()

  const afterClose = pizzeriaCalls
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 30)
  })
  assert.equal(pizzeriaCalls, afterClose)
})

function pizzeria (id: string): Pizzeria {
  return {
    id,
    name: id,
    latitude: 32.08,
    longitude: 34.78,
    averageEta: null
  }
}

function menu (pizzeriaId: string): Menu {
  return {
    pizzeriaId,
    currency: 'ILS',
    sizes: [],
    crusts: [],
    sauces: [],
    toppings: []
  }
}

async function waitUntil (isReady: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (isReady()) {
      return
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5)
    })
  }
  throw new Error('Timed out waiting for listen warming')
}
