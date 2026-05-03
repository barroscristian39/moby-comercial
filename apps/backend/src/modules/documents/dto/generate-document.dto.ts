import { z } from 'zod'
import { DocumentTypeSchema } from './upload-function-template.dto'

export const GenerateDocumentSchema = z.object({
  documentType: DocumentTypeSchema,
  templateId: z.string().uuid('templateId inválido').optional(),
}).strict()

export type GenerateDocumentDto = z.infer<typeof GenerateDocumentSchema>
