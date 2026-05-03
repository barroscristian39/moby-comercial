import { AccidentSeverity, AccidentStatus, AccidentType } from '@moby/shared'

export interface AccidentEntity {
  id: string
  tenantId: string
  companyId: string
  companyName: string | null
  unitId: string
  unitName: string
  employeeId: string
  employeeName: string
  employeeCpf: string
  employeeRegistration: string | null
  jobFunctionId: string | null
  jobFunctionName: string | null
  code: string
  occurredAt: Date
  reportedAt: Date
  location: string
  accidentType: AccidentType
  severity: AccidentSeverity
  status: AccidentStatus
  description: string
  injuredBodyPart: string | null
  medicalCareProvided: boolean
  leaveRequired: boolean
  leaveDays: number
  catIssued: boolean
  catNumber: string | null
  witnesses: string | null
  immediateActions: string | null
  investigatorName: string | null
  investigationStartedAt: Date | null
  immediateCause: string | null
  rootCause: string | null
  contributingFactors: string | null
  correctiveActions: string | null
  preventiveMeasures: string | null
  managerNotes: string | null
  recommendations: string | null
  conclusionSummary: string | null
  closureDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
