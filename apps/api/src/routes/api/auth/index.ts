import { randomUUID } from 'node:crypto'
import type { PublicUser } from '@pizzawise/shared'
import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { EmailValidationError, normalizeEmail } from '../../../auth/email.js'
import {
  hashPassword,
  PasswordValidationError,
  verifyPassword
} from '../../../auth/password.js'
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  sessionCookieOptions
} from '../../../auth/session-cookie.js'
import {
  generateSessionToken,
  hashSessionToken
} from '../../../auth/session-token.js'
import { DuplicateEmailError, type UserRecord } from '../../../auth/user-store.js'

interface AuthBody {
  email: string
  password: string
}

const authBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string' },
    password: { type: 'string' }
  }
} as const

const auth: FastifyPluginAsync = async (fastify): Promise<void> => {
  const cookieOptions = sessionCookieOptions()

  async function createSession (
    reply: FastifyReply,
    user: UserRecord
  ): Promise<void> {
    const now = new Date()
    const rawToken = generateSessionToken()
    await fastify.sessionStore.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashSessionToken(rawToken),
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS)
    })
    reply.setCookie(SESSION_COOKIE_NAME, rawToken, cookieOptions)
  }

  fastify.post<{ Body: AuthBody }>(
    '/register',
    { schema: { body: authBodySchema } },
    async (request, reply) => {
      let email: string
      try {
        email = normalizeEmail(request.body.email)
      } catch (error) {
        if (error instanceof EmailValidationError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }

      let passwordHash: string
      try {
        passwordHash = await hashPassword(request.body.password)
      } catch (error) {
        if (error instanceof PasswordValidationError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }

      const user: UserRecord = {
        id: randomUUID(),
        email,
        passwordHash,
        createdAt: new Date()
      }

      try {
        await fastify.userStore.create(user)
      } catch (error) {
        if (error instanceof DuplicateEmailError) {
          throw fastify.httpErrors.conflict('Email already exists')
        }
        throw error
      }

      await createSession(reply, user)
      return toPublicUser(user)
    }
  )

  fastify.post<{ Body: AuthBody }>(
    '/login',
    { schema: { body: authBodySchema } },
    async (request, reply) => {
      let email: string
      try {
        email = normalizeEmail(request.body.email)
      } catch (error) {
        if (error instanceof EmailValidationError) {
          throw fastify.httpErrors.unauthorized('Invalid email or password')
        }
        throw error
      }

      const user = await fastify.userStore.findByEmail(email)
      if (user === null) {
        throw fastify.httpErrors.unauthorized('Invalid email or password')
      }

      const passwordMatches = await verifyPassword(
        user.passwordHash,
        request.body.password
      )
      if (!passwordMatches) {
        throw fastify.httpErrors.unauthorized('Invalid email or password')
      }

      await createSession(reply, user)
      return toPublicUser(user)
    }
  )

  fastify.post('/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (token !== undefined && token.length > 0) {
      await fastify.sessionStore.deleteByTokenHash(hashSessionToken(token))
    }

    reply.clearCookie(SESSION_COOKIE_NAME, {
      path: cookieOptions.path
    })
    return reply.code(204).send()
  })

  fastify.get(
    '/me',
    { preHandler: fastify.authenticate },
    async (request) => {
      return toPublicUser(request.user)
    }
  )
}

function toPublicUser (user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString()
  }
}

export default auth
