import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'
import type { RiskLevel, RiskProbability, RiskSeverity, RiskType } from '@moby/shared'

export interface Risk {
  id: string
  tenantId: string
  companyId: string
  companyName: string | null
  unitId: string
  unitName: string
  jobFunctionId: string | null
  jobFunctionName: string | null
  name: string
  type: RiskType
  level: RiskLevel
  probability: RiskProbability
  severity: RiskSeverity
  description: string | null
  controlMeasures: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateRiskDto {
  unitId: string
  jobFunctionId?: string | null
  name: string
  type: RiskType
  level: RiskLevel
  probability: RiskProbability
  severity: RiskSeverity
  description?: string
  controlMeasures?: string
}

export interface UpdateRiskDto extends Partial<CreateRiskDto> {
  isActive?: boolean
}

export const risksApi = {
  findAll: async (params?: {
    page?: number
    perPage?: number
    tenantId?: string
    companyId?: string
    unitId?: string
    search?: string
    isActive?: boolean
    type?: RiskType
    level?: RiskLevel
  }) => {
    const { data } = await api.get('/risks', { params })
    return data as PaginatedResponse<Risk>
  },

  findOne: async (id: string) => {
    const { data } = await api.get(`/risks/${id}`)
    return data.data as Risk
  },

  create: async (dto: CreateRiskDto) => {
    const { data } = await api.post('/risks', dto)
    return data.data as Risk
  },

  update: async (id: string, dto: UpdateRiskDto) => {
    const { data } = await api.patch(`/risks/${id}`, dto)
    return data.data as Risk
  },

  remove: async (id: string) => {
    await api.delete(`/risks/${id}`)
  },
}
