import { z } from 'zod'

export const DownloadGeneratedDocumentQuerySchema = z.object({
  format: z.enum(['pdf', 'docx']).default('pdf'),
})

export type DownloadGeneratedDocumentQueryDto = z.infer<typeof DownloadGeneratedDocumentQuerySchema>
