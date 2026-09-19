import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { loadDatabaseConfig } from './config.js'
import { schema } from './schema.js'

export type Database = MySql2Database<typeof schema>

export interface DatabaseConnection {
  readonly db: Database
  ping(): Promise<void>
  close(): Promise<void>
}

export function createDatabaseFromEnv (
  environment: NodeJS.ProcessEnv = process.env
): DatabaseConnection {
  const { url } = loadDatabaseConfig(environment)
  const pool = mysql.createPool({ uri: url })
  const db = drizzle(pool, {
    schema,
    mode: 'default'
  })

  return {
    db,
    async ping () {
      await pool.query('SELECT 1')
    },
    async close () {
      await pool.end()
    }
  }
}
