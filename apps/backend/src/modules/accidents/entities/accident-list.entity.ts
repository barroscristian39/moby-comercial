import {
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
} from '@moby/shared'

export interface AccidentListEntity {
  id: string
  tenantId: string
  companyId: string
  companyName: string | null
  unitId: string
  unitName: string
  employeeId: string
  employeeName: string
  employeeCpfMasked: string | null
  employeeRegistration: string | null
  code: string
  occurredAt: Date
  accidentType: AccidentType
  severity: AccidentSeverity
  status: AccidentStatus
  leaveRequired: boolean
  leaveDays: number
  isActive: boolean
}
