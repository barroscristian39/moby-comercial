import { z } from 'zod'

export const CreateEpiItemSchema = z.object({
  companyId:        z.string().uuid('companyId inválido'),
  name:             z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  description:      z.string().optional(),
  caNumber:         z.string().min(1, 'CA é obrigatório'),
  caExpiry:         z.string().date('Data de vencimento inválida').optional(),
  manufacturer:     z.string().optional(),
  unitOfMeasure:    z.string().default('unidade'),
  stockQuantity:    z.coerce.number().int().min(0).default(0),
  minStockQuantity: z.coerce.number().int().min(0).default(0),
})

export type CreateEpiItemDto = z.infer<typeof CreateEpiItemSchema>
