import { z } from 'zod'

export const GetDashboardMetricsSchema = z.object({
  companyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
})

export type GetDashboardMetricsDto = z.infer<typeof GetDashboardMetricsSchema>
