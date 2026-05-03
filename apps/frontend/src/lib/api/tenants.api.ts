import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export interface Tenant {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELED'
  plan: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTenantDto {
  name: string
  slug?: string
  status?: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELED'
  plan?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  admin: {
    name: string
    email: string
    password: string
  }
}

export const tenantsApi = {
  findAll: async (params?: { page?: number; perPage?: number; search?: string }) => {
    const { data } = await api.get('/tenants', { params })
    return data as PaginatedResponse<Tenant>
  },

  create: async (dto: CreateTenantDto) => {
    const { data } = await api.post('/tenants', dto)
    return data.data as Tenant
  },
}
