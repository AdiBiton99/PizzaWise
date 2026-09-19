import type { UserProfile } from '@pizzawise/shared'
import type { FastifyPluginAsync } from 'fastify'
import {
  assertProfileBodyShape,
  normalizeDisplayName,
  normalizePhone,
  ProfileValidationError
} from '../../../profiles/profile-fields.js'
import type { ProfileRecord } from '../../../profiles/profile-store.js'

interface ProfileBody {
  displayName: string
  phone: string
}

const profileBodySchema = {
  type: 'object',
  required: ['displayName', 'phone'],
  additionalProperties: false,
  properties: {
    displayName: { type: 'string' },
    phone: { type: 'string' }
  }
} as const

const profile: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get(
    '/',
    { preHandler: fastify.authenticate },
    async (request) => {
      const record = await fastify.profileStore.findByUserId(request.user.id)
      if (record === null) {
        throw fastify.httpErrors.notFound('Profile not found')
      }

      return toUserProfile(record)
    }
  )

  fastify.put<{ Body: ProfileBody }>(
    '/',
    {
      preHandler: fastify.authenticate,
      preValidation: async (request) => {
        try {
          assertProfileBodyShape(request.body)
        } catch (error) {
          if (error instanceof ProfileValidationError) {
            throw fastify.httpErrors.badRequest(error.message)
          }
          throw error
        }
      },
      schema: { body: profileBodySchema }
    },
    async (request) => {
      let displayName: string
      let phone: string
      try {
        displayName = normalizeDisplayName(request.body.displayName)
        phone = normalizePhone(request.body.phone)
      } catch (error) {
        if (error instanceof ProfileValidationError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }

      const profileRecord: ProfileRecord = {
        userId: request.user.id,
        displayName,
        phone
      }
      await fastify.profileStore.upsert(profileRecord)
      return toUserProfile(profileRecord)
    }
  )
}

function toUserProfile (record: ProfileRecord): UserProfile {
  return {
    userId: record.userId,
    displayName: record.displayName,
    phone: record.phone
  }
}

export default profile
