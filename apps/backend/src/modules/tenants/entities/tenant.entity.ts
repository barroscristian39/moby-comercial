export interface TenantEntity {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
