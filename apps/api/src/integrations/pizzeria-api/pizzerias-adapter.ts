import type { EtaRange, Pizzeria } from '@pizzawise/shared'
import { PizzeriaApiAdapterError, malformedResponseError } from './adapter-error.js'
import {
  externalPizzeriasResponseSchema,
  type ExternalEta
} from './external-schemas.js'

const ETA_RANGE_PATTERN = /^\s*(\d+)\s*-\s*(\d+)\s*$/

export function normalizeEta (value: ExternalEta): EtaRange | null {
  if (value === null) {
    return null
  }

  if (typeof value === 'number') {
    return {
      minMinutes: value,
      maxMinutes: value
    }
  }

  const match = ETA_RANGE_PATTERN.exec(value)
  if (match === null) {
    throw new PizzeriaApiAdapterError(
      `Unsupported avgEtaMinutes value: ${JSON.stringify(value)}`
    )
  }

  const minMinutes = Number(match[1])
  const maxMinutes = Number(match[2])

  if (
    !Number.isSafeInteger(minMinutes) ||
    !Number.isSafeInteger(maxMinutes) ||
    minMinutes > maxMinutes
  ) {
    throw new PizzeriaApiAdapterError(
      `Invalid avgEtaMinutes range: ${JSON.stringify(value)}`
    )
  }

  return {
    minMinutes,
    maxMinutes
  }
}

export function normalizePizzeriasResponse (input: unknown): Pizzeria[] {
  const result = externalPizzeriasResponseSchema.safeParse(input)
  if (!result.success) {
    throw malformedResponseError('pizzerias', result.error)
  }

  if (result.data.count !== result.data.pizzerias.length) {
    throw new PizzeriaApiAdapterError(
      `Pizzeria count mismatch: expected ${result.data.count}, received ${result.data.pizzerias.length}`
    )
  }

  return result.data.pizzerias.map((pizzeria) => ({
    id: pizzeria.id,
    name: pizzeria.name,
    latitude: pizzeria.lat,
    longitude: pizzeria.lng,
    averageEta: normalizeEta(pizzeria.avgEtaMinutes)
  }))
}
