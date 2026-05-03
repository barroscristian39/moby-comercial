// Funções de acesso à API de itens de EPI (catálogo)
import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export interface EpiItem {
  id: string
  companyId: string
  name: string
  description: string | null
  caNumber: string
  caExpiry: string | null
  manufacturer: string | null
  unitOfMeasure: string
  stockQuantity: number
  minStockQuantity: number
  isCaExpired: boolean
  isLowStock: boolean
  isActive: boolean
  createdAt: string
}

export interface CreateEpiItemDto {
  companyId: string
  name: string
  description?: string
  caNumber: string
  caExpiry?: string
  manufacturer?: string
  unitOfMeasure?: string
  stockQuantity?: number
  minStockQuantity?: number
}

export interface UpdateEpiItemDto extends Partial<CreateEpiItemDto> {
  isActive?: boolean
}

export const epiItemsApi = {
  findAll: async (params?: { page?: number; perPage?: number; search?: string; isActive?: boolean }) => {
    const { data } = await api.get('/epi-items', { params })
    return data as PaginatedResponse<EpiItem>
  },

  create: async (dto: CreateEpiItemDto) => {
    const { data } = await api.post('/epi-items', dto)
    return data.data as EpiItem
  },

  update: async (id: string, dto: UpdateEpiItemDto) => {
    const { data } = await api.patch(`/epi-items/${id}`, dto)
    return data.data as EpiItem
  },

  remove: async (id: string) => {
    await api.delete(`/epi-items/${id}`)
  },
}
