export interface UserEntity {
  id: string
  tenantId: string | null
  email: string
  name: string
  role: string
  companyId: string | null
  companyIds: string[]
  unitIds: string[]
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}
