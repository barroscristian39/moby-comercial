export interface EmployeeListEntity {
  id: string
  companyId: string
  unitId: string
  sectorId: string | null
  jobFunctionId: string
  name: string
  cpfMasked: string | null
  registration: string | null
  admissionDate: Date
  dismissalDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
