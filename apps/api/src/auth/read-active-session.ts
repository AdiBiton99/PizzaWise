import type { FastifyRequest } from 'fastify'
import { SESSION_COOKIE_NAME } from './session-cookie.js'
import type { SessionRecord, SessionStore } from './session-store.js'
import { hashSessionToken } from './session-token.js'

export async function readActiveSession (
  sessionStore: SessionStore,
  request: FastifyRequest
): Promise<SessionRecord | null> {
  const token = request.cookies[SESSION_COOKIE_NAME]
  if (token === undefined || token.length === 0) {
    return null
  }

  const tokenHash = hashSessionToken(token)
  const session = await sessionStore.findByTokenHash(tokenHash)
  if (session === null) {
    return null
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await sessionStore.deleteByTokenHash(tokenHash)
    return null
  }

  return session
}
