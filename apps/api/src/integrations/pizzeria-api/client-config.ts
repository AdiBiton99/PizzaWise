import { PizzeriaApiClientError } from './client-error.js'

export interface PizzeriaApiClientConfig {
  readonly baseUrl: string
  readonly apiKey: string
}

export function loadPizzeriaApiClientConfig (
  environment: NodeJS.ProcessEnv = process.env
): PizzeriaApiClientConfig {
  const baseUrl = environment.PIZZERIA_API_BASE_URL
  const apiKey = environment.PIZZERIA_API_KEY

  if (baseUrl === undefined || baseUrl.length === 0) {
    throw new PizzeriaApiClientError(
      'PIZZERIA_API_BASE_URL must be configured'
    )
  }

  if (apiKey === undefined || apiKey.length === 0) {
    throw new PizzeriaApiClientError('PIZZERIA_API_KEY must be configured')
  }

  let parsedBaseUrl: URL
  try {
    parsedBaseUrl = new URL(baseUrl)
  } catch (cause) {
    throw new PizzeriaApiClientError(
      'PIZZERIA_API_BASE_URL must be a valid URL',
      { cause }
    )
  }

  if (
    parsedBaseUrl.protocol !== 'http:' &&
    parsedBaseUrl.protocol !== 'https:'
  ) {
    throw new PizzeriaApiClientError(
      'PIZZERIA_API_BASE_URL must use HTTP or HTTPS'
    )
  }

  parsedBaseUrl.search = ''
  parsedBaseUrl.hash = ''
  if (!parsedBaseUrl.pathname.endsWith('/')) {
    parsedBaseUrl.pathname += '/'
  }

  return {
    baseUrl: parsedBaseUrl.toString(),
    apiKey
  }
}
