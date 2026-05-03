import { z } from 'zod'
import { DocumentTypeSchema } from './upload-function-template.dto'

export const UploadAccidentTemplateSchema = z.object({
  documentType: DocumentTypeSchema,
  name: z.string().trim().min(2).max(120).optional(),
}).strict()

export type UploadAccidentTemplateDto = z.infer<typeof UploadAccidentTemplateSchema>
