import { z } from 'zod'
import { CreateTrainingSchema } from './create-training.dto'

export const UpdateTrainingSchema = CreateTrainingSchema.omit({ employeeId: true }).partial().extend({
  isActive: z.coerce.boolean().optional(),
})

export type UpdateTrainingDto = z.infer<typeof UpdateTrainingSchema>
