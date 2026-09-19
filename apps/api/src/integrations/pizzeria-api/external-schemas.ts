import { z } from 'zod'

const nonEmptyString = z.string().min(1)
const safeNonNegativeInteger = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger, 'Expected a safe integer')

export const externalEtaSchema = z.union([
  safeNonNegativeInteger,
  z.string().min(1),
  z.null()
])

export const externalPizzeriaSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  avgEtaMinutes: externalEtaSchema
})

export const externalPizzeriasResponseSchema = z.object({
  count: safeNonNegativeInteger,
  pizzerias: z.array(externalPizzeriaSchema)
})

const centsPricedLabelOptionSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  priceCents: safeNonNegativeInteger
})

const centsPricedNamedOptionSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  priceCents: safeNonNegativeInteger
})

export const centsMenuResponseSchema = z.object({
  pizzeriaId: nonEmptyString,
  currency: nonEmptyString,
  priceUnit: z.literal('cents'),
  menu: z.object({
    sizes: z.array(centsPricedLabelOptionSchema),
    crusts: z.array(centsPricedLabelOptionSchema),
    sauces: z.array(z.string()),
    toppings: z.array(centsPricedNamedOptionSchema)
  })
})

const decimalPriceSchema = z.number().finite().nonnegative()

const decimalPricedLabelOptionSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  price: decimalPriceSchema
})

const decimalPricedNamedOptionSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  price: decimalPriceSchema
})

export const decimalMenuResponseSchema = z.object({
  pizzeria_id: nonEmptyString,
  currency: nonEmptyString,
  price_unit: z.literal('decimal'),
  sizes: z.array(decimalPricedLabelOptionSchema),
  crusts: z.array(decimalPricedLabelOptionSchema),
  sauces: z.array(z.string()),
  toppings: z.array(decimalPricedNamedOptionSchema)
})

export type ExternalEta = z.infer<typeof externalEtaSchema>
export type ExternalPizzeria = z.infer<typeof externalPizzeriaSchema>
export type ExternalPizzeriasResponse = z.infer<
  typeof externalPizzeriasResponseSchema
>
export type CentsMenuResponse = z.infer<typeof centsMenuResponseSchema>
export type DecimalMenuResponse = z.infer<typeof decimalMenuResponseSchema>
