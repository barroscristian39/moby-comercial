import { z } from 'zod'

// Após registrada, entrega só aceita anotações e devolução
export const UpdateEpiDeliverySchema = z.object({
  returnedAt: z.string().date('Data de devolução inválida').optional(),
  notes:      z.string().optional(),
})

export type UpdateEpiDeliveryDto = z.infer<typeof UpdateEpiDeliverySchema>
