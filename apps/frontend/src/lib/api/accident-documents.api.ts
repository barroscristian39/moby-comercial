import { api } from '@/lib/api'

export interface AccidentTemplate {
  id: string
  tenantId: string
  companyId: string
  documentType: string
  name: string
  version: number
  variables: string[]
  isActive: boolean
  createdBy: string
  createdAt: string
}

export interface AccidentGeneratedDocument {
  id: string
  tenantId: string
  companyId: string
  accidentId: string
  employeeId: string
  unitId: string
  templateId: string
  documentType: string
  generatedBy: string
  generatedAt: string
  status: 'ACTIVE' | 'DELETED'
}

export type AccidentGeneratedDocumentDownloadFormat = 'pdf' | 'docx'

export const accidentDocumentsApi = {
  listTemplates: async (companyId: string) => {
    const { data } = await api.get(`/companies/${companyId}/accident-templates`)
    return data.data as AccidentTemplate[]
  },

  uploadTemplate: async (
    companyId: string,
    input: { documentType: string; name?: string; file: File },
  ) => {
    const formData = new FormData()
    formData.append('documentType', input.documentType)
    if (input.name) formData.append('name', input.name)
    formData.append('file', input.file)

    const { data } = await api.post(`/companies/${companyId}/accident-templates`, formData)
    return data.data as AccidentTemplate
  },

  updateTemplate: async (
    companyId: string,
    templateId: string,
    input: { name?: string; isActive?: boolean },
  ) => {
    const { data } = await api.patch(`/companies/${companyId}/accident-templates/${templateId}`, input)
    return data.data as AccidentTemplate
  },

  deleteTemplate: async (companyId: string, templateId: string) => {
    await api.delete(`/companies/${companyId}/accident-templates/${templateId}`)
  },

  generateForAccident: async (
    accidentId: string,
    input: { documentType: string; templateId?: string },
  ) => {
    const { data } = await api.post(`/accidents/${accidentId}/documents/generate`, input)
    return data.data as AccidentGeneratedDocument
  },

  listAccidentDocuments: async (accidentId: string) => {
    const { data } = await api.get(`/accidents/${accidentId}/documents`)
    return data.data as AccidentGeneratedDocument[]
  },

  deleteGeneratedDocument: async (documentId: string) => {
    await api.delete(`/accident-documents/${documentId}`)
  },

  downloadGeneratedDocument: async (
    document: AccidentGeneratedDocument,
    format: AccidentGeneratedDocumentDownloadFormat = 'pdf',
  ) => {
    const response = await api.get(`/accident-documents/${document.id}/download`, {
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

  const asciiMatch = disposition.match(/filename=\"?([^\";]+)\"?/i)
  return asciiMatch?.[1] ?? null
}
