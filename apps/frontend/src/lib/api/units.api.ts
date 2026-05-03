// Funções de acesso à API de unidades
import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export interface Unit {
  id: string
  tenantId: string
  companyId: string
  name: string
  cnpj: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressCity: string | null
  addressState: string | null
  addressZipCode: string | null
  isActive: boolean
  createdAt: string
}

export interface CreateUnitDto {
  companyId: string
  name: string
  cnpj?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressNeighborhood?: string
  addressCity?: string
  addressState?: string
  addressZipCode?: string
  phone?: string
  email?: string
}

export interface UpdateUnitDto extends Partial<CreateUnitDto> {
  isActive?: boolean
}

export const unitsApi = {
  findAll: async (params?: { page?: number; perPage?: number; search?: string; companyId?: string }) => {
    const { data } = await api.get('/units', { params })
    return data as PaginatedResponse<Unit>
  },

  create: async (dto: CreateUnitDto) => {
    const { data } = await api.post('/units', dto)
    return data.data as Unit
  },

  update: async (id: string, dto: UpdateUnitDto) => {
    const { data } = await api.patch(`/units/${id}`, dto)
    return data.data as Unit
  },

  remove: async (id: string) => {
    await api.delete(`/units/${id}`)
  },
}
