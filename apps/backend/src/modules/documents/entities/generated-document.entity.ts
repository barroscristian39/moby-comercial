export interface GeneratedDocumentEntity {
  id: string
  tenantId: string
  employeeId: string
  functionId: string
  unitId: string
  templateId: string
  documentType: string
  generatedBy: string
  generatedAt: Date
  status: 'ACTIVE' | 'DELETED'
}
