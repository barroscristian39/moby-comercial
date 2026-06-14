import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  sstLegalDocumentsApi,
  type EmitSstLegalDocumentDto,
  type SstLegalDocument,
  type SstLegalDocumentStatus,
  type SstLegalDocumentType,
} from '@/lib/api/sst-legal-documents.api'
import { triggerToast } from '@/lib/toast-registry'

export function useSstLegalDocuments(params?: {
  page?: number
  perPage?: number
  companyId?: string
  unitId?: string
  documentType?: SstLegalDocumentType
  status?: SstLegalDocumentStatus
  search?: string
}) {
  return useQuery({
    queryKey: ['sst-legal-documents', params],
    queryFn: () => sstLegalDocumentsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useEmitSstLegalDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: EmitSstLegalDocumentDto) => sstLegalDocumentsApi.emit(dto),
    onSuccess: (document) => {
      triggerToast({
        title: '✓ Documento emitido',
        description: `${document.documentType} v${document.version} foi salvo no histórico`,
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['sst-legal-documents'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'], exact: false })
    },
  })
}

export function useDownloadSstLegalDocument() {
  return useMutation({
    mutationFn: (document: SstLegalDocument) => sstLegalDocumentsApi.downloadHtml(document),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    },
  })
}
