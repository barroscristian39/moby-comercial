export interface SectorEntity {
  id: string
  companyId: string
  unitId: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
