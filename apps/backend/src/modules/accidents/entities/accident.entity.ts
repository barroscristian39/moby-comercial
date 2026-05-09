import {
  AccidentActivityType,
  AccidentBodyPart,
  AccidentCommuteSubtype,
  AccidentInjuredSide,
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  AccidentTypicalSubtype,
  AccidentWorkJourneyType,
} from '@moby/shared'

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
  regional: string | null
  unitManagerName: string | null
  salary: string | null
  employeePhone: string | null
  workSchedule: string | null
  totalTimeInRole: string | null
  activityType: AccidentActivityType | null
  previousAccident: boolean
  previousAccidentDescription: string | null
  occurredAt: Date
  reportedAt: Date
  location: string
  occurrenceAddress: string | null
  accidentType: AccidentType
  typicalSubtypes: AccidentTypicalSubtype[]
  typicalSubtypeOther: string | null
  commuteSubtypes: AccidentCommuteSubtype[]
  commuteSubtypeOther: string | null
  workJourneyType: AccidentWorkJourneyType | null
  scheduleChangeStart: string | null
  scheduleChangeEnd: string | null
  severity: AccidentSeverity
  status: AccidentStatus
  description: string
  injuredSide: AccidentInjuredSide | null
  injuredBodyParts: AccidentBodyPart[]
  injuredBodyPartOther: string | null
  injuredBodyPart: string | null
  medicalCareProvided: boolean
  medicalCareTime: string | null
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
