import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'
import type { AccidentSeverity, AccidentStatus, AccidentType } from '@moby/shared'

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
  occurredAt: string
  reportedAt: string
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
  occurredAt: string
  reportedAt?: string
  location: string
  accidentType: AccidentType
  severity: AccidentSeverity
  status?: AccidentStatus
  description: string
  injuredBodyPart?: string
  medicalCareProvided?: boolean
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
  | 'injuredBodyPart'
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
  injuredBodyPart?: string | null
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
    return data as PaginatedResponse<Accident>
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
