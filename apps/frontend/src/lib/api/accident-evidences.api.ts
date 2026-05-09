import type { AccidentEvidenceType } from '@moby/shared'
import { api } from '@/lib/api'

export interface AccidentEvidence {
  id: string
  tenantId: string
  companyId: string
  accidentId: string
  evidenceType: AccidentEvidenceType
  fileName: string
  mimeType: string
  fileSize: number
  notes: string | null
  createdBy: string
  createdAt: string
  isActive: boolean
}

export const accidentEvidencesApi = {
  list: async (accidentId: string) => {
    const { data } = await api.get(`/accidents/${accidentId}/evidences`)
    return data.data as AccidentEvidence[]
  },

  upload: async (
    accidentId: string,
    input: { evidenceType: AccidentEvidenceType; notes?: string; file: File },
  ) => {
    const formData = new FormData()
    formData.append('evidenceType', input.evidenceType)
    if (input.notes) formData.append('notes', input.notes)
    formData.append('file', input.file)

    const { data } = await api.post(`/accidents/${accidentId}/evidences`, formData)
    return data.data as AccidentEvidence
  },

  remove: async (accidentId: string, evidenceId: string) => {
    await api.delete(`/accidents/${accidentId}/evidences/${evidenceId}`)
  },

  download: async (accidentId: string, evidenceId: string, fallbackFilename: string) => {
    const response = await api.get(`/accidents/${accidentId}/evidences/${evidenceId}/download`, {
      responseType: 'blob',
    })
    const filename = filenameFromDisposition(response.headers['content-disposition']) ?? fallbackFilename

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
