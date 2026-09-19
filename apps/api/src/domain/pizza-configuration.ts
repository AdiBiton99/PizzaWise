import {
  CRUST_TAG_VALUES,
  SAUCE_TAG_VALUES,
  SIZE_TAG_VALUES,
  TOPPING_TAG_VALUES,
  type DesiredOptionTag,
  type PizzaConfiguration
} from '@pizzawise/shared'

export class PizzaConfigurationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'PizzaConfigurationError'
  }
}

export function assertPizzaConfigurationShape (
  value: unknown
): asserts value is {
  sizeTag: string
  crustTag: string
  sauceTag: string
  toppingTags: string[]
} {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new PizzaConfigurationError('Pizza configuration is invalid')
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  if (
    keys.length !== 4 ||
    typeof record.sizeTag !== 'string' ||
    typeof record.crustTag !== 'string' ||
    typeof record.sauceTag !== 'string' ||
    !Array.isArray(record.toppingTags) ||
    record.toppingTags.some((tag) => typeof tag !== 'string')
  ) {
    throw new PizzaConfigurationError('Pizza configuration is invalid')
  }

  const allowed = new Set(['sizeTag', 'crustTag', 'sauceTag', 'toppingTags'])
  if (keys.some((key) => !allowed.has(key))) {
    throw new PizzaConfigurationError('Pizza configuration is invalid')
  }
}

export function parsePizzaConfiguration (value: {
  sizeTag: string
  crustTag: string
  sauceTag: string
  toppingTags: readonly string[]
}): PizzaConfiguration {
  return {
    sizeTag: parseKnownTag(value.sizeTag, SIZE_TAG_VALUES, 'size'),
    crustTag: parseKnownTag(value.crustTag, CRUST_TAG_VALUES, 'crust'),
    sauceTag: parseKnownTag(value.sauceTag, SAUCE_TAG_VALUES, 'sauce'),
    toppingTags: parseToppingTags(value.toppingTags)
  }
}

function parseKnownTag (
  tag: string,
  allowed: ReadonlySet<DesiredOptionTag>,
  kind: string
): DesiredOptionTag {
  if (!allowed.has(tag)) {
    throw new PizzaConfigurationError(`Pizza ${kind} tag is invalid`)
  }

  return tag
}

function parseToppingTags (
  toppingTags: readonly string[]
): readonly DesiredOptionTag[] {
  const unique = new Set<string>()
  for (const tag of toppingTags) {
    if (!TOPPING_TAG_VALUES.has(tag)) {
      throw new PizzaConfigurationError('Pizza topping tag is invalid')
    }
    if (unique.has(tag)) {
      throw new PizzaConfigurationError('Pizza topping tags must be unique')
    }
    unique.add(tag)
  }

  return [...toppingTags].sort((left, right) => left.localeCompare(right))
}
