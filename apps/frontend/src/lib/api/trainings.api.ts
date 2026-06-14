import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export type TrainingStatus = 'SCHEDULED' | 'COMPLETED' | 'EXPIRED' | 'CANCELED'

export interface Training {
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
  completedAt: string | null
  dueDate: string
  certificateUrl: string | null
  status: TrainingStatus
  notes: string | null
  isExpired: boolean
  isExpiring: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTrainingDto {
  employeeId: string
  name: string
  provider?: string
  workloadHours?: number
  completedAt?: string
  dueDate: string
  certificateUrl?: string
  status?: TrainingStatus
  notes?: string
}

export interface UpdateTrainingDto extends Partial<Omit<CreateTrainingDto, 'employeeId'>> {
  isActive?: boolean
}

export const trainingsApi = {
  findAll: async (params?: {
    page?: number
    perPage?: number
    employeeId?: string
    search?: string
    isActive?: boolean
    status?: 'expired' | 'expiring' | 'valid'
  }) => {
    const { data } = await api.get('/trainings', { params })
    return data as PaginatedResponse<Training>
  },

  create: async (dto: CreateTrainingDto) => {
    const { data } = await api.post('/trainings', dto)
    return data.data as Training
  },

  update: async (id: string, dto: UpdateTrainingDto) => {
    const { data } = await api.patch(`/trainings/${id}`, dto)
    return data.data as Training
  },

  remove: async (id: string) => {
    await api.delete(`/trainings/${id}`)
  },
}
