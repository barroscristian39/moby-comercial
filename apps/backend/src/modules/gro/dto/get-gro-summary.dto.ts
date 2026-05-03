import { z } from 'zod'

export const GetGroSummarySchema = z.object({
  companyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
})

export type GetGroSummaryDto = z.infer<typeof GetGroSummarySchema>
