import { z } from 'zod'

export const FunctionStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
export const SafeIdSchema = z.string()
  .trim()
  .min(3, 'ID inválido')
  .max(80, 'ID inválido')
  .regex(/^[A-Za-z0-9_-]+$/, 'ID inválido')

export const CreateFunctionSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  description: z.string().trim().max(1000).optional(),
  cbo: z.string().trim().max(20).optional(),
  companyId: z.string().uuid('companyId inválido').optional(),
  unitIds: z.array(SafeIdSchema).min(1, 'Vincule ao menos uma unidade').max(100),
  status: FunctionStatusSchema.default('ACTIVE'),
}).strict()

export type CreateFunctionDto = z.infer<typeof CreateFunctionSchema>
