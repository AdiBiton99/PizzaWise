import type { UserProfile } from '@pizzawise/shared'
import type { FastifyPluginAsync } from 'fastify'
import {
  DEFAULT_PROFILE_DISPLAY_NAME,
  assertProfileBodyShape,
  normalizeDefaultDeliveryAddress,
  normalizePhone,
  ProfileValidationError,
  type ProfileBody
} from '../../../profiles/profile-fields.js'
import type { ProfileRecord } from '../../../profiles/profile-store.js'

const profileBodySchema = {
  type: 'object',
  required: ['phone', 'defaultDeliveryAddress'],
  additionalProperties: false,
  properties: {
    phone: { type: 'string' },
    defaultDeliveryAddress: { type: ['string', 'null'] }
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
      let phone: string
      let defaultDeliveryAddress: string | null
      try {
        phone = normalizePhone(request.body.phone)
        defaultDeliveryAddress = normalizeDefaultDeliveryAddress(
          request.body.defaultDeliveryAddress
        )
      } catch (error) {
        if (error instanceof ProfileValidationError) {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }

      const existing = await fastify.profileStore.findByUserId(request.user.id)
      const profileRecord: ProfileRecord = {
        userId: request.user.id,
        displayName: existing?.displayName ?? DEFAULT_PROFILE_DISPLAY_NAME,
        phone,
        defaultDeliveryAddress
      }
      await fastify.profileStore.upsert(profileRecord)
      return toUserProfile(profileRecord)
    }
  )
}

function toUserProfile (record: ProfileRecord): UserProfile {
  return {
    userId: record.userId,
    phone: record.phone,
    defaultDeliveryAddress: record.defaultDeliveryAddress
  }
}

export default profile
