import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export type SstLegalDocumentType = 'PGR' | 'PCMSO' | 'LTCAT' | 'LIP'
export type SstLegalDocumentStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED'

export interface SstLegalDocument {
  id: string
  tenantId: string
  companyId: string
  unitId: string | null
  companyName?: string
  unitName?: string | null
  documentType: SstLegalDocumentType
  title: string
  version: number
  status: SstLegalDocumentStatus
  summary: string | null
  effectiveFrom: string | null
  effectiveUntil: string | null
  generatedBy: string
  generatorName?: string
  generatedAt: string
}

export interface EmitSstLegalDocumentDto {
  companyId: string
  unitId?: string
  documentType: SstLegalDocumentType
  title?: string
  summary?: string
  effectiveFrom?: string
  effectiveUntil?: string
}

export const sstLegalDocumentsApi = {
  findAll: async (params?: {
    page?: number
    perPage?: number
    companyId?: string
    unitId?: string
    documentType?: SstLegalDocumentType
    status?: SstLegalDocumentStatus
    search?: string
  }) => {
    const { data } = await api.get('/documents/legal', { params })
    return data as PaginatedResponse<SstLegalDocument>
  },

  emit: async (dto: EmitSstLegalDocumentDto) => {
    const { data } = await api.post('/documents/legal/emit', dto)
    return data.data as SstLegalDocument
  },

  downloadHtml: async (document: SstLegalDocument) => {
    const response = await api.get(`/documents/legal/${document.id}/download`, {
      responseType: 'blob',
    })
    const filename = filenameFromDisposition(response.headers['content-disposition'])
      ?? `${document.documentType.toLowerCase()}-v${document.version}-${document.id}.html`

    return {
      blob: response.data as Blob,
      filename,
    }
  },
}

function filenameFromDisposition(disposition: string | undefined) {
  if (!disposition) return null
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])

  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i)
  return asciiMatch?.[1] ?? null
}
