import { z } from 'zod'
import { FunctionStatusSchema, SafeIdSchema } from './create-function.dto'

export const UpdateFunctionSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  cbo: z.string().trim().max(20).optional(),
  companyId: z.string().uuid('companyId inválido').optional(),
  unitIds: z.array(SafeIdSchema).min(1).max(100).optional(),
  status: FunctionStatusSchema.optional(),
}).strict()

export type UpdateFunctionDto = z.infer<typeof UpdateFunctionSchema>
