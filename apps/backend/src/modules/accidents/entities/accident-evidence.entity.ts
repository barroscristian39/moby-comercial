import { AccidentEvidenceType } from '@moby/shared'

export interface AccidentEvidenceEntity {
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
  createdAt: Date
  isActive: boolean
}
