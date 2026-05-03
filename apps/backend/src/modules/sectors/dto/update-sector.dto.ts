import { z } from 'zod'

export const UpdateSectorSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateSectorDto = z.infer<typeof UpdateSectorSchema>
