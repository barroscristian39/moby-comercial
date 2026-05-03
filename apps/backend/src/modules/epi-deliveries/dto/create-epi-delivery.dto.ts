import { z } from 'zod'

export const CreateEpiDeliverySchema = z.object({
  companyId:   z.string().uuid('companyId inválido'),
  employeeId:  z.string().uuid('employeeId inválido'),
  epiItemId:   z.string().uuid('epiItemId inválido'),
  quantity:    z.coerce.number().int().min(1, 'Quantidade mínima é 1').default(1),
  deliveredAt: z.string().date('Data de entrega inválida'),
  reason:      z.enum(['ADMISSION', 'PERIODIC', 'REPLACEMENT', 'FUNCTION_CHANGE', 'CA_RENEWAL', 'OTHER']),
  condition:   z.enum(['NEW', 'USED']).default('NEW'),
  deliveredBy: z.string().optional(),
  notes:       z.string().optional(),
})

export type CreateEpiDeliveryDto = z.infer<typeof CreateEpiDeliverySchema>
