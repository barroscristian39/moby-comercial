import { z } from 'zod'

export const EmitSstLegalDocumentSchema = z.object({
  companyId: z.string().uuid('companyId inválido'),
  unitId: z.string().uuid('unitId inválido').optional(),
  documentType: z.enum(['PGR', 'PCMSO', 'LTCAT', 'LIP']),
  title: z.string().trim().min(3).max(160).optional(),
  summary: z.string().trim().max(2000).optional(),
  effectiveFrom: z.string().date('Data inicial inválida').optional(),
  effectiveUntil: z.string().date('Data final inválida').optional(),
})

export type EmitSstLegalDocumentDto = z.infer<typeof EmitSstLegalDocumentSchema>

export const ListSstLegalDocumentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  companyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  documentType: z.enum(['PGR', 'PCMSO', 'LTCAT', 'LIP']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED']).optional(),
  search: z.string().trim().optional(),
})

export type ListSstLegalDocumentsDto = z.infer<typeof ListSstLegalDocumentsSchema>
