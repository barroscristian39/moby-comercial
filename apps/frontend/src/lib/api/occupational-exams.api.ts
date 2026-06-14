import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export type OccupationalExamType =
  | 'ADMISSIONAL'
  | 'PERIODIC'
  | 'RETURN_TO_WORK'
  | 'ROLE_CHANGE'
  | 'DISMISSAL'
  | 'COMPLEMENTARY'

export type OccupationalExamResult = 'FIT' | 'UNFIT' | 'FIT_WITH_RESTRICTIONS' | 'PENDING'

export interface OccupationalExam {
  id: string
  tenantId: string
  companyId: string
  unitId: string
  employeeId: string
  jobFunctionId: string | null
  employeeName?: string
  unitName?: string
  jobFunctionName?: string | null
  examType: OccupationalExamType
  name: string
  provider: string | null
  performedAt: string | null
  dueDate: string
  result: OccupationalExamResult
  asoIssued: boolean
  asoNumber: string | null
  notes: string | null
  isExpired: boolean
  isExpiring: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateOccupationalExamDto {
  employeeId: string
  examType: OccupationalExamType
  name: string
  provider?: string
  performedAt?: string
  dueDate: string
  result?: OccupationalExamResult
  asoIssued?: boolean
  asoNumber?: string
  notes?: string
}

export interface UpdateOccupationalExamDto extends Partial<Omit<CreateOccupationalExamDto, 'employeeId'>> {
  isActive?: boolean
}

export const occupationalExamsApi = {
  findAll: async (params?: {
    page?: number
    perPage?: number
    employeeId?: string
    search?: string
    isActive?: boolean
    status?: 'expired' | 'expiring' | 'valid'
  }) => {
    const { data } = await api.get('/occupational-exams', { params })
    return data as PaginatedResponse<OccupationalExam>
  },

  create: async (dto: CreateOccupationalExamDto) => {
    const { data } = await api.post('/occupational-exams', dto)
    return data.data as OccupationalExam
  },

  update: async (id: string, dto: UpdateOccupationalExamDto) => {
    const { data } = await api.patch(`/occupational-exams/${id}`, dto)
    return data.data as OccupationalExam
  },

  remove: async (id: string) => {
    await api.delete(`/occupational-exams/${id}`)
  },
}
