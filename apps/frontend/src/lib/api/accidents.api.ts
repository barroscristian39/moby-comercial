import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'
import type {
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

export interface Accident {
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
  occurredAt: string
  reportedAt: string
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
  investigationStartedAt: string | null
  immediateCause: string | null
  rootCause: string | null
  contributingFactors: string | null
  correctiveActions: string | null
  preventiveMeasures: string | null
  managerNotes: string | null
  recommendations: string | null
  conclusionSummary: string | null
  closureDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AccidentListItem {
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
  occurredAt: string
  accidentType: AccidentType
  severity: AccidentSeverity
  status: AccidentStatus
  leaveRequired: boolean
  leaveDays: number
  isActive: boolean
}

export interface AccidentConclusionReport {
  accidentId: string
  code: string
  generatedAt: string
  header: {
    companyName: string
    unitName: string
    employeeName: string
    employeeCpf: string | null
    employeeRegistration: string | null
    jobFunctionName: string | null
  }
  occurrence: {
    occurredAt: string
    reportedAt: string
    location: string
    accidentType: AccidentType
    accidentTypeLabel: string
    severity: AccidentSeverity
    severityLabel: string
    description: string
    injuredBodyPart: string | null
    medicalCareProvided: boolean
    leaveRequired: boolean
    leaveDays: number
    catIssued: boolean
    catNumber: string | null
  }
  investigation: {
    investigatorName: string | null
    investigationStartedAt: string | null
    witnesses: string | null
    immediateActions: string | null
    immediateCause: string | null
    rootCause: string | null
    contributingFactors: string | null
    correctiveActions: string | null
    preventiveMeasures: string | null
    managerNotes: string | null
    recommendations: string | null
  }
  conclusion: {
    status: AccidentStatus
    statusLabel: string
    closureDate: string | null
    summary: string | null
  }
  narrative: string[]
}

export interface CreateAccidentDto {
  employeeId: string
  regional: string
  unitManagerName?: string
  salary?: string
  employeePhone?: string
  workSchedule?: string
  totalTimeInRole?: string
  activityType?: AccidentActivityType
  previousAccident?: boolean
  previousAccidentDescription?: string
  occurredAt: string
  reportedAt?: string
  location: string
  occurrenceAddress?: string
  accidentType: AccidentType
  typicalSubtypes?: AccidentTypicalSubtype[]
  typicalSubtypeOther?: string
  commuteSubtypes?: AccidentCommuteSubtype[]
  commuteSubtypeOther?: string
  workJourneyType?: AccidentWorkJourneyType
  scheduleChangeStart?: string
  scheduleChangeEnd?: string
  severity: AccidentSeverity
  status?: AccidentStatus
  description: string
  injuredSide?: AccidentInjuredSide
  injuredBodyParts: AccidentBodyPart[]
  injuredBodyPartOther?: string
  injuredBodyPart?: string
  medicalCareProvided?: boolean
  medicalCareTime?: string
  leaveRequired?: boolean
  leaveDays?: number
  catIssued?: boolean
  catNumber?: string
  witnesses?: string
  immediateActions?: string
  investigatorName?: string
  investigationStartedAt?: string
  immediateCause?: string
  rootCause?: string
  contributingFactors?: string
  correctiveActions?: string
  preventiveMeasures?: string
  managerNotes?: string
  recommendations?: string
  conclusionSummary?: string
  closureDate?: string
}

export interface UpdateAccidentDto extends Omit<Partial<CreateAccidentDto>,
  | 'unitManagerName'
  | 'salary'
  | 'employeePhone'
  | 'workSchedule'
  | 'totalTimeInRole'
  | 'activityType'
  | 'previousAccidentDescription'
  | 'occurrenceAddress'
  | 'typicalSubtypeOther'
  | 'commuteSubtypeOther'
  | 'workJourneyType'
  | 'scheduleChangeStart'
  | 'scheduleChangeEnd'
  | 'injuredSide'
  | 'injuredBodyPart'
  | 'injuredBodyPartOther'
  | 'medicalCareTime'
  | 'catNumber'
  | 'witnesses'
  | 'immediateActions'
  | 'investigatorName'
  | 'investigationStartedAt'
  | 'immediateCause'
  | 'rootCause'
  | 'contributingFactors'
  | 'correctiveActions'
  | 'preventiveMeasures'
  | 'managerNotes'
  | 'recommendations'
  | 'conclusionSummary'
  | 'closureDate'
> {
  unitManagerName?: string | null
  salary?: string | null
  employeePhone?: string | null
  workSchedule?: string | null
  totalTimeInRole?: string | null
  activityType?: AccidentActivityType | null
  previousAccidentDescription?: string | null
  occurrenceAddress?: string | null
  typicalSubtypeOther?: string | null
  commuteSubtypeOther?: string | null
  workJourneyType?: AccidentWorkJourneyType | null
  scheduleChangeStart?: string | null
  scheduleChangeEnd?: string | null
  injuredSide?: AccidentInjuredSide | null
  injuredBodyPart?: string | null
  injuredBodyPartOther?: string | null
  medicalCareTime?: string | null
  catNumber?: string | null
  witnesses?: string | null
  immediateActions?: string | null
  investigatorName?: string | null
  investigationStartedAt?: string | null
  immediateCause?: string | null
  rootCause?: string | null
  contributingFactors?: string | null
  correctiveActions?: string | null
  preventiveMeasures?: string | null
  managerNotes?: string | null
  recommendations?: string | null
  conclusionSummary?: string | null
  closureDate?: string | null
  isActive?: boolean
}

export const accidentsApi = {
  findAll: async (params?: {
    page?: number
    perPage?: number
    tenantId?: string
    companyId?: string
    unitId?: string
    employeeId?: string
    search?: string
    status?: AccidentStatus
    severity?: AccidentSeverity
    accidentType?: AccidentType
    fromDate?: string
    toDate?: string
  }) => {
    const { data } = await api.get('/accidents', { params })
    return data as PaginatedResponse<AccidentListItem>
  },

  findOne: async (id: string) => {
    const { data } = await api.get(`/accidents/${id}`)
    return data.data as Accident
  },

  findConclusionReport: async (id: string) => {
    const { data } = await api.get(`/accidents/${id}/conclusion-report`)
    return data.data as AccidentConclusionReport
  },

  create: async (dto: CreateAccidentDto) => {
    const { data } = await api.post('/accidents', dto)
    return data.data as Accident
  },

  update: async (id: string, dto: UpdateAccidentDto) => {
    const { data } = await api.patch(`/accidents/${id}`, dto)
    return data.data as Accident
  },

  remove: async (id: string) => {
    await api.delete(`/accidents/${id}`)
  },
}
