import { api } from '@/lib/api'

export interface FunctionTemplate {
  id: string
  tenantId: string
  functionId: string
  documentType: string
  name: string
  version: number
  variables: string[]
  isActive: boolean
  createdBy: string
  createdAt: string
}

export interface GeneratedDocument {
  id: string
  tenantId: string
  employeeId: string
  functionId: string
  unitId: string
  templateId: string
  documentType: string
  generatedBy: string
  generatedAt: string
  status: 'ACTIVE' | 'DELETED'
}

export type GeneratedDocumentDownloadFormat = 'pdf' | 'docx'

export const functionDocumentsApi = {
  listTemplates: async (functionId: string) => {
    const { data } = await api.get(`/functions/${functionId}/templates`)
    return data.data as FunctionTemplate[]
  },

  uploadTemplate: async (
    functionId: string,
    input: { documentType: string; name?: string; file: File },
  ) => {
    const formData = new FormData()
    formData.append('documentType', input.documentType)
    if (input.name) formData.append('name', input.name)
    formData.append('file', input.file)

    const { data } = await api.post(`/functions/${functionId}/templates`, formData)
    return data.data as FunctionTemplate
  },

  updateTemplate: async (
    functionId: string,
    templateId: string,
    input: { name?: string; isActive?: boolean },
  ) => {
    const { data } = await api.patch(`/functions/${functionId}/templates/${templateId}`, input)
    return data.data as FunctionTemplate
  },

  deleteTemplate: async (functionId: string, templateId: string) => {
    await api.delete(`/functions/${functionId}/templates/${templateId}`)
  },

  generateForEmployee: async (
    employeeId: string,
    input: { documentType: string; templateId?: string },
  ) => {
    const { data } = await api.post(`/documents/generate/${employeeId}`, input)
    return data.data as GeneratedDocument
  },

  listEmployeeDocuments: async (employeeId: string) => {
    const { data } = await api.get(`/employees/${employeeId}/documents`)
    return data.data as GeneratedDocument[]
  },

  deleteGeneratedDocument: async (documentId: string) => {
    await api.delete(`/documents/${documentId}`)
  },

  downloadGeneratedDocument: async (
    document: GeneratedDocument,
    format: GeneratedDocumentDownloadFormat = 'pdf',
  ) => {
    const response = await api.get(`/documents/${document.id}/download`, {
      params: { format },
      responseType: 'blob',
    })
    const filename = filenameFromDisposition(response.headers['content-disposition'])
      ?? `${document.documentType.toLowerCase()}-${document.id}.${format}`

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
