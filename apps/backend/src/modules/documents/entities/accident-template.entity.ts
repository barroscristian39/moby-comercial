export interface AccidentTemplateEntity {
  id: string
  tenantId: string
  companyId: string
  documentType: string
  name: string
  version: number
  variables: string[]
  isActive: boolean
  createdBy: string
  createdAt: Date
}
