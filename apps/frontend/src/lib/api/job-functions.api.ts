// Funções de acesso à API de funções/cargos
import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export interface JobFunction {
  id: string
  tenantId?: string
  companyId: string
  unitIds?: string[]
  unitId: string | null
  sectorId: string | null
  name: string
  cbo: string | null
  description: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  isActive: boolean
  createdAt: string
}

export interface CreateJobFunctionDto {
  companyId?: string
  unitId?: string
  unitIds?: string[]
  sectorId?: string
  name: string
  cbo?: string
  description?: string
}

export interface UpdateJobFunctionDto extends Partial<CreateJobFunctionDto> {
  isActive?: boolean
  status?: 'ACTIVE' | 'INACTIVE'
}

export const jobFunctionsApi = {
  findAll: async (params?: { page?: number; perPage?: number; unitId?: string; sectorId?: string; search?: string }) => {
    const { data } = await api.get('/functions', { params })
    return {
      ...data,
      data: data.data.map(normalizeFunction),
    } as PaginatedResponse<JobFunction>
  },

  findOne: async (id: string) => {
    const { data } = await api.get(`/functions/${id}`)
    return normalizeFunction(data.data)
  },

  create: async (dto: CreateJobFunctionDto) => {
    const { data } = await api.post('/functions', toFunctionsPayload(dto))
    return normalizeFunction(data.data)
  },

  update: async (id: string, dto: UpdateJobFunctionDto) => {
    const { data } = await api.patch(`/functions/${id}`, toFunctionsPayload(dto))
    return normalizeFunction(data.data)
  },

  remove: async (id: string) => {
    await api.delete(`/functions/${id}`)
  },
}

function toFunctionsPayload(dto: UpdateJobFunctionDto) {
  const unitIds = dto.unitIds ?? (dto.unitId ? [dto.unitId] : undefined)
  return {
    name: dto.name,
    cbo: dto.cbo,
    description: dto.description,
    companyId: dto.companyId,
    unitIds,
    status: dto.status ?? (dto.isActive === undefined ? undefined : dto.isActive ? 'ACTIVE' : 'INACTIVE'),
  }
}

function normalizeFunction(data: any): JobFunction {
  const unitIds = data.unitIds ?? (data.unitId ? [data.unitId] : [])
  return {
    id: data.id,
    tenantId: data.tenantId,
    companyId: data.companyId,
    unitIds,
    unitId: unitIds[0] ?? null,
    sectorId: data.sectorId ?? null,
    name: data.name,
    cbo: data.cbo ?? null,
    description: data.description ?? null,
    status: data.status,
    isActive: data.isActive ?? data.status === 'ACTIVE',
    createdAt: data.createdAt,
  }
}
