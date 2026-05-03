export interface AccidentGeneratedDocumentEntity {
  id: string
  tenantId: string
  companyId: string
  accidentId: string
  employeeId: string
  unitId: string
  templateId: string
  documentType: string
  generatedBy: string
  generatedAt: Date
  status: 'ACTIVE' | 'DELETED'
}
