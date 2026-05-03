import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  accidentDocumentsApi,
  type AccidentGeneratedDocument,
  type AccidentGeneratedDocumentDownloadFormat,
} from '@/lib/api/accident-documents.api'
import { triggerToast } from '@/lib/toast-registry'

export function useAccidentTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: ['accident-templates', companyId],
    queryFn: () => accidentDocumentsApi.listTemplates(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 30,
  })
}

export function useUploadAccidentTemplate(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { documentType: string; name?: string; file: File }) =>
      accidentDocumentsApi.uploadTemplate(companyId, input),
    onSuccess: (template) => {
      triggerToast({
        title: '✓ Template enviado',
        description: `${template.variables.length} variável${template.variables.length === 1 ? '' : 'is'} detectada${template.variables.length === 1 ? '' : 's'}`,
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accident-templates', companyId] })
    },
  })
}

export function useUpdateAccidentTemplate(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { templateId: string; name?: string; isActive?: boolean }) =>
      accidentDocumentsApi.updateTemplate(companyId, input.templateId, {
        name: input.name,
        isActive: input.isActive,
      }),
    onSuccess: (_template, input) => {
      const description = input.name !== undefined
        ? 'O nome do template foi atualizado'
        : input.isActive
          ? 'O template foi ativado'
          : 'O template foi desativado'

      triggerToast({
        title: '✓ Template atualizado',
        description,
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accident-templates', companyId] })
    },
  })
}

export function useDeleteAccidentTemplate(companyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => accidentDocumentsApi.deleteTemplate(companyId, templateId),
    onSuccess: () => {
      triggerToast({
        title: '✓ Template excluído',
        description: 'O template foi removido da empresa',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accident-templates', companyId] })
    },
  })
}

export function useGenerateAccidentDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { accidentId: string; documentType: string; templateId?: string }) =>
      accidentDocumentsApi.generateForAccident(input.accidentId, {
        documentType: input.documentType,
        templateId: input.templateId,
      }),
    onSuccess: (_document, input) => {
      triggerToast({
        title: '✓ Documento gerado',
        description: 'O documento foi salvo no histórico do acidente',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accident-generated-documents', input.accidentId] })
    },
  })
}

export function useAccidentGeneratedDocuments(accidentId: string | undefined) {
  return useQuery({
    queryKey: ['accident-generated-documents', accidentId],
    queryFn: () => accidentDocumentsApi.listAccidentDocuments(accidentId!),
    enabled: !!accidentId,
    staleTime: 1000 * 30,
  })
}

export function useDeleteAccidentGeneratedDocument(accidentId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => accidentDocumentsApi.deleteGeneratedDocument(documentId),
    onSuccess: () => {
      triggerToast({
        title: '✓ Documento excluído',
        description: 'O documento foi removido do histórico ativo',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accident-generated-documents', accidentId] })
    },
  })
}

export function useDownloadAccidentGeneratedDocument() {
  return useMutation({
    mutationFn: (input: { document: AccidentGeneratedDocument; format?: AccidentGeneratedDocumentDownloadFormat }) =>
      accidentDocumentsApi.downloadGeneratedDocument(input.document, input.format),
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
