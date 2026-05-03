export interface FunctionEntity {
  id: string
  tenantId: string
  companyId: string
  unitIds: string[]
  name: string
  cbo: string | null
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
