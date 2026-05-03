import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  functionDocumentsApi,
  type GeneratedDocument,
  type GeneratedDocumentDownloadFormat,
} from '@/lib/api/function-documents.api'
import { triggerToast } from '@/lib/toast-registry'

export function useFunctionTemplates(functionId: string | undefined) {
  return useQuery({
    queryKey: ['function-templates', functionId],
    queryFn: () => functionDocumentsApi.listTemplates(functionId!),
    enabled: !!functionId,
    staleTime: 1000 * 30,
  })
}

export function useUploadFunctionTemplate(functionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { documentType: string; name?: string; file: File }) =>
      functionDocumentsApi.uploadTemplate(functionId, input),
    onSuccess: (template) => {
      triggerToast({
        title: '✓ Template enviado',
        description: `${template.variables.length} variável${template.variables.length === 1 ? '' : 'is'} detectada${template.variables.length === 1 ? '' : 's'}`,
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['function-templates', functionId] })
    },
  })
}

export function useUpdateFunctionTemplate(functionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { templateId: string; name?: string; isActive?: boolean }) =>
      functionDocumentsApi.updateTemplate(functionId, input.templateId, {
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
      qc.invalidateQueries({ queryKey: ['function-templates', functionId] })
    },
  })
}

export function useDeleteFunctionTemplate(functionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => functionDocumentsApi.deleteTemplate(functionId, templateId),
    onSuccess: () => {
      triggerToast({
        title: '✓ Template excluído',
        description: 'O template foi removido da função',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['function-templates', functionId] })
    },
  })
}

export function useGenerateFunctionDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { employeeId: string; documentType: string; templateId?: string }) =>
      functionDocumentsApi.generateForEmployee(input.employeeId, {
        documentType: input.documentType,
        templateId: input.templateId,
      }),
    onSuccess: (_document, input) => {
      triggerToast({
        title: '✓ Documento gerado',
        description: 'O documento foi salvo no histórico do colaborador',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['employee-documents', input.employeeId] })
    },
  })
}

export function useEmployeeDocuments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: () => functionDocumentsApi.listEmployeeDocuments(employeeId!),
    enabled: !!employeeId,
    staleTime: 1000 * 30,
  })
}

export function useDeleteGeneratedDocument(employeeId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => functionDocumentsApi.deleteGeneratedDocument(documentId),
    onSuccess: () => {
      triggerToast({
        title: '✓ Documento excluído',
        description: 'O documento foi removido do histórico ativo',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['employee-documents', employeeId] })
    },
  })
}

export function useDownloadGeneratedDocument() {
  return useMutation({
    mutationFn: (input: { document: GeneratedDocument; format?: GeneratedDocumentDownloadFormat }) =>
      functionDocumentsApi.downloadGeneratedDocument(input.document, input.format),
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
