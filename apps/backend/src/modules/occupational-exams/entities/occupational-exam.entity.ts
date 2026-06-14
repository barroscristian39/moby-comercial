export interface OccupationalExamEntity {
  id: string
  tenantId: string
  companyId: string
  unitId: string
  employeeId: string
  jobFunctionId: string | null
  employeeName?: string
  unitName?: string
  jobFunctionName?: string | null
  examType: string
  name: string
  provider: string | null
  performedAt: Date | null
  dueDate: Date
  result: string
  asoIssued: boolean
  asoNumber: string | null
  notes: string | null
  isExpired: boolean
  isExpiring: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
