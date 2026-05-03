// Funções de acesso à API de setores
import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export interface Sector {
  id: string
  companyId: string
  unitId: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
}

export interface CreateSectorDto {
  companyId: string
  unitId: string
  name: string
  description?: string
}

export interface UpdateSectorDto extends Partial<CreateSectorDto> {
  isActive?: boolean
}

export const sectorsApi = {
  findAll: async (params?: { page?: number; perPage?: number; unitId?: string; search?: string }) => {
    const { data } = await api.get('/sectors', { params })
    return data as PaginatedResponse<Sector>
  },

  create: async (dto: CreateSectorDto) => {
    const { data } = await api.post('/sectors', dto)
    return data.data as Sector
  },

  update: async (id: string, dto: UpdateSectorDto) => {
    const { data } = await api.patch(`/sectors/${id}`, dto)
    return data.data as Sector
  },

  remove: async (id: string) => {
    await api.delete(`/sectors/${id}`)
  },
}
