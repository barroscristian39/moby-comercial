import { z } from 'zod'

export const CreateOccupationalExamSchema = z.object({
  employeeId: z.string().uuid('employeeId inválido'),
  examType: z.enum(['ADMISSIONAL', 'PERIODIC', 'RETURN_TO_WORK', 'ROLE_CHANGE', 'DISMISSAL', 'COMPLEMENTARY']),
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  provider: z.string().trim().max(120).optional(),
  performedAt: z.string().date('Data de realização inválida').optional(),
  dueDate: z.string().date('Data de vencimento inválida'),
  result: z.enum(['FIT', 'UNFIT', 'FIT_WITH_RESTRICTIONS', 'PENDING']).default('PENDING'),
  asoIssued: z.coerce.boolean().default(false),
  asoNumber: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
})

export type CreateOccupationalExamDto = z.infer<typeof CreateOccupationalExamSchema>
