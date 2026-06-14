export interface SstLegalDocumentEntity {
  id: string
  tenantId: string
  companyId: string
  unitId: string | null
  companyName?: string
  unitName?: string | null
  documentType: string
  title: string
  version: number
  status: string
  summary: string | null
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  generatedBy: string
  generatorName?: string
  generatedAt: Date
}
