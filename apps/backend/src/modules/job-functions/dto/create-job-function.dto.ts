import { z } from 'zod'

export const CreateJobFunctionSchema = z.object({
  companyId: z.string().uuid('companyId inválido'),
  unitId: z.string().uuid('unitId inválido').optional(),
  sectorId: z.string().uuid('sectorId inválido').optional(),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cbo: z.string().optional(),
  description: z.string().optional(),
})

export type CreateJobFunctionDto = z.infer<typeof CreateJobFunctionSchema>
