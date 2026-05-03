import { z } from 'zod'

export const UpdateJobFunctionSchema = z.object({
  name: z.string().min(2).optional(),
  cbo: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
}).strict()

export type UpdateJobFunctionDto = z.infer<typeof UpdateJobFunctionSchema>
