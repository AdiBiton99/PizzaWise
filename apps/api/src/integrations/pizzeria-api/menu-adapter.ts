import type {
  Menu,
  Money,
  PricedProviderOption,
  Sauce
} from '@pizzawise/shared'
import { PizzeriaApiAdapterError, malformedResponseError } from './adapter-error.js'
import {
  centsMenuResponseSchema,
  decimalMenuResponseSchema,
  type CentsMenuResponse,
  type DecimalMenuResponse
} from './external-schemas.js'

const ILS_MINOR_DIGITS = 2

function centsMoney (amountMinor: number, currency: string): Money {
  return {
    amountMinor,
    currency
  }
}

function decimalIlsToMinorUnits (amount: number): number {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(
    amount.toString()
  )

  if (match === null) {
    throw new PizzeriaApiAdapterError(
      `Invalid decimal ILS price: ${JSON.stringify(amount)}`
    )
  }

  const whole = match[1] ?? ''
  const fraction = match[2] ?? ''
  const exponent = Number(match[3] ?? '0')
  const coefficient = BigInt(`${whole}${fraction}`)
  const minorUnitPower = exponent - fraction.length + ILS_MINOR_DIGITS

  let amountMinor: bigint
  if (minorUnitPower >= 0) {
    amountMinor = coefficient * 10n ** BigInt(minorUnitPower)
  } else {
    const divisor = 10n ** BigInt(-minorUnitPower)
    if (coefficient % divisor !== 0n) {
      throw new PizzeriaApiAdapterError(
        `Decimal ILS price has more than two fractional digits: ${amount}`
      )
    }
    amountMinor = coefficient / divisor
  }

  if (amountMinor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new PizzeriaApiAdapterError(
      `Decimal ILS price exceeds the safe integer range: ${amount}`
    )
  }

  return Number(amountMinor)
}

function decimalMoney (amount: number, currency: string): Money {
  if (currency !== 'ILS') {
    throw new PizzeriaApiAdapterError(
      `Unsupported decimal currency: ${JSON.stringify(currency)}`
    )
  }

  return {
    amountMinor: decimalIlsToMinorUnits(amount),
    currency
  }
}

function centsLabelOption (
  option: CentsMenuResponse['menu']['sizes'][number],
  currency: string
): PricedProviderOption {
  return {
    providerId: option.id,
    providerName: option.label,
    semanticTag: null,
    price: centsMoney(option.priceCents, currency)
  }
}

function centsNamedOption (
  option: CentsMenuResponse['menu']['toppings'][number],
  currency: string
): PricedProviderOption {
  return {
    providerId: option.id,
    providerName: option.name,
    semanticTag: null,
    price: centsMoney(option.priceCents, currency)
  }
}

function decimalLabelOption (
  option: DecimalMenuResponse['sizes'][number],
  currency: string
): PricedProviderOption {
  return {
    providerId: option.id,
    providerName: option.label,
    semanticTag: null,
    price: decimalMoney(option.price, currency)
  }
}

function decimalNamedOption (
  option: DecimalMenuResponse['toppings'][number],
  currency: string
): PricedProviderOption {
  return {
    providerId: option.id,
    providerName: option.name,
    semanticTag: null,
    price: decimalMoney(option.price, currency)
  }
}

function sauce (providerName: string): Sauce {
  return {
    providerName,
    semanticTag: null
  }
}

export function normalizeCentsMenuResponse (input: unknown): Menu {
  const result = centsMenuResponseSchema.safeParse(input)
  if (!result.success) {
    throw malformedResponseError('cents menu', result.error)
  }

  const { currency, menu, pizzeriaId } = result.data

  return {
    pizzeriaId,
    currency,
    sizes: menu.sizes.map((option) => centsLabelOption(option, currency)),
    crusts: menu.crusts.map((option) => centsLabelOption(option, currency)),
    sauces: menu.sauces.map(sauce),
    toppings: menu.toppings.map((option) => centsNamedOption(option, currency))
  }
}

export function normalizeDecimalMenuResponse (input: unknown): Menu {
  const result = decimalMenuResponseSchema.safeParse(input)
  if (!result.success) {
    throw malformedResponseError('decimal menu', result.error)
  }

  const { currency, pizzeria_id: pizzeriaId } = result.data

  return {
    pizzeriaId,
    currency,
    sizes: result.data.sizes.map((option) =>
      decimalLabelOption(option, currency)
    ),
    crusts: result.data.crusts.map((option) =>
      decimalLabelOption(option, currency)
    ),
    sauces: result.data.sauces.map(sauce),
    toppings: result.data.toppings.map((option) =>
      decimalNamedOption(option, currency)
    )
  }
}

export function normalizeMenuResponse (input: unknown): Menu {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new PizzeriaApiAdapterError('Menu response must be an object')
  }

  const response = input as Record<string, unknown>
  const hasCamelDiscriminator = Object.hasOwn(response, 'priceUnit')
  const hasSnakeDiscriminator = Object.hasOwn(response, 'price_unit')

  if (
    hasCamelDiscriminator &&
    !hasSnakeDiscriminator &&
    response.priceUnit === 'cents'
  ) {
    return normalizeCentsMenuResponse(input)
  }

  if (
    hasSnakeDiscriminator &&
    !hasCamelDiscriminator &&
    response.price_unit === 'decimal'
  ) {
    return normalizeDecimalMenuResponse(input)
  }

  throw new PizzeriaApiAdapterError(
    `Unsupported or ambiguous menu price unit: ${JSON.stringify({
      priceUnit: response.priceUnit,
      price_unit: response.price_unit
    })}`
  )
}
