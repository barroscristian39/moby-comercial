export interface JobFunctionEntity {
  id: string
  companyId: string
  unitId: string | null
  sectorId: string | null
  name: string
  cbo: string | null
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
