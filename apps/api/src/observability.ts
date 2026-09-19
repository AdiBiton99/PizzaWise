import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { FastifyServerOptions } from 'fastify'

export const REQUEST_ID_HEADER = 'x-request-id'

const SENSITIVE_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  '*.password',
  '*.passwordHash',
  '*.apiKey',
  '*.token',
  '*.tokenHash'
]

export function createServerObservabilityOptions (
  environment: NodeJS.ProcessEnv = process.env
): FastifyServerOptions {
  return {
    trustProxy: true,
    requestIdHeader: REQUEST_ID_HEADER,
    requestIdLogLabel: 'reqId',
    genReqId (req: IncomingMessage) {
      const incoming = req.headers[REQUEST_ID_HEADER]
      if (typeof incoming === 'string' && incoming.length > 0) {
        return incoming
      }
      if (Array.isArray(incoming) && incoming[0] !== undefined && incoming[0].length > 0) {
        return incoming[0]
      }
      return randomUUID()
    },
    logger: {
      level: environment.LOG_LEVEL ?? 'info',
      redact: {
        paths: [...SENSITIVE_LOG_PATHS],
        censor: '[Redacted]'
      }
    }
  }
}
