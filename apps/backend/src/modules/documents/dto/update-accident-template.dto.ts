import { z } from 'zod'

export const UpdateAccidentTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateAccidentTemplateDto = z.infer<typeof UpdateAccidentTemplateSchema>
