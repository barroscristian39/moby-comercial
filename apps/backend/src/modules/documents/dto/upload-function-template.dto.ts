import { z } from 'zod'

export const DocumentTypeSchema = z.string()
  .trim()
  .min(2, 'Tipo de documento obrigatório')
  .max(60)
  .regex(/^[A-Za-z0-9_-]+$/, 'Tipo de documento deve conter apenas letras, números, hífen ou underline')
  .transform((value) => value.toUpperCase())

export const UploadFunctionTemplateSchema = z.object({
  documentType: DocumentTypeSchema,
  name: z.string().trim().min(2).max(120).optional(),
}).strict()

export type UploadFunctionTemplateDto = z.infer<typeof UploadFunctionTemplateSchema>
