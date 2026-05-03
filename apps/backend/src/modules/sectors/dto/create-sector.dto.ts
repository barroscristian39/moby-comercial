import { z } from 'zod'

export const CreateSectorSchema = z.object({
  companyId: z.string().uuid('companyId inválido'),
  unitId: z.string().uuid('unitId inválido'),
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  description: z.string().optional(),
})

export type CreateSectorDto = z.infer<typeof CreateSectorSchema>
