import { z } from 'zod'

export const CreateTrainingSchema = z.object({
  employeeId: z.string().uuid('employeeId inválido'),
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  provider: z.string().trim().max(120).optional(),
  workloadHours: z.coerce.number().int().min(1).max(1000).optional(),
  completedAt: z.string().date('Data de conclusão inválida').optional(),
  dueDate: z.string().date('Data de vencimento inválida'),
  certificateUrl: z.string().trim().url('URL do certificado inválida').optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'EXPIRED', 'CANCELED']).default('SCHEDULED'),
  notes: z.string().trim().max(2000).optional(),
})

export type CreateTrainingDto = z.infer<typeof CreateTrainingSchema>
