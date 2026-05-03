export interface EmployeeEntity {
  id: string
  companyId: string
  unitId: string
  sectorId: string | null
  jobFunctionId: string
  name: string
  cpf: string
  email: string | null
  phone: string | null
  birthDate: Date | null
  gender: string | null
  registration: string | null
  admissionDate: Date
  dismissalDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
