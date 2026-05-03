export interface FunctionTemplateEntity {
  id: string
  tenantId: string
  functionId: string
  documentType: string
  name: string
  version: number
  variables: string[]
  isActive: boolean
  createdBy: string
  createdAt: Date
}
