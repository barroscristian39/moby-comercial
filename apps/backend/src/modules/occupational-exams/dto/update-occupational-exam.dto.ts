import { CreateOccupationalExamSchema } from './create-occupational-exam.dto'
import { z } from 'zod'

export const UpdateOccupationalExamSchema = CreateOccupationalExamSchema.omit({ employeeId: true }).partial().extend({
  isActive: z.coerce.boolean().optional(),
})

export type UpdateOccupationalExamDto = z.infer<typeof UpdateOccupationalExamSchema>
