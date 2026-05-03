import { z } from 'zod'
import { CreateEpiItemSchema } from './create-epi-item.dto'

export const UpdateEpiItemSchema = CreateEpiItemSchema.omit({ companyId: true }).partial()

export type UpdateEpiItemDto = z.infer<typeof UpdateEpiItemSchema>
