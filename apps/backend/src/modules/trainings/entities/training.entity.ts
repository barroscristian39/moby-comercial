export interface TrainingEntity {
  id: string
  tenantId: string
  companyId: string
  unitId: string
  employeeId: string
  jobFunctionId: string | null
  employeeName?: string
  unitName?: string
  jobFunctionName?: string | null
  name: string
  provider: string | null
  workloadHours: number | null
  completedAt: Date | null
  dueDate: Date
  certificateUrl: string | null
  status: string
  notes: string | null
  isExpired: boolean
  isExpiring: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
