import { z } from 'zod'

export const geoapifySearchResponseSchema = z.object({
  results: z.array(
    z.object({
      formatted: z.string().min(1),
      lat: z.number().finite().min(-90).max(90),
      lon: z.number().finite().min(-180).max(180)
    })
  )
})

export type GeoapifySearchResponse = z.infer<
  typeof geoapifySearchResponseSchema
>
