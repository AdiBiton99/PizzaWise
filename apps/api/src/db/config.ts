export class DatabaseConfigError extends Error {
  constructor (message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DatabaseConfigError'
  }
}

export interface DatabaseConfig {
  readonly url: string
}

export function loadDatabaseConfig (
  environment: NodeJS.ProcessEnv = process.env
): DatabaseConfig {
  const url = environment.DATABASE_URL

  if (url === undefined || url.length === 0) {
    throw new DatabaseConfigError('DATABASE_URL must be configured')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch (cause) {
    throw new DatabaseConfigError('DATABASE_URL must be a valid URL', { cause })
  }

  if (parsedUrl.protocol !== 'mysql:' && parsedUrl.protocol !== 'mysql2:') {
    throw new DatabaseConfigError('DATABASE_URL must use the mysql or mysql2 protocol')
  }

  return { url }
}
