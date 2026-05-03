import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TECNICO_SST' | 'GESTOR' | 'RH' | 'CONSULTA'

export interface User {
  id: string
  tenantId: string | null
  email: string
  name: string
  role: UserRole
  companyId: string | null
  companyIds: string[]
  unitIds: string[]
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  tenantId?: string | null
  name: string
  email: string
  password: string
  role: UserRole
  isActive?: boolean
  companyIds: string[]
  unitIds: string[]
}

export interface UpdateUserDto {
  name?: string
  role?: UserRole
  isActive?: boolean
  companyIds?: string[]
  unitIds?: string[]
}

export const usersApi = {
  findAll: async (params?: { page?: number; perPage?: number; search?: string; tenantId?: string }) => {
    const { data } = await api.get('/users', { params })
    return data as PaginatedResponse<User>
  },

  create: async (dto: CreateUserDto) => {
    const { data } = await api.post('/users', dto)
    return data.data as User
  },

  update: async (id: string, dto: UpdateUserDto) => {
    const { data } = await api.patch(`/users/${id}`, dto)
    return data.data as User
  },

  remove: async (id: string) => {
    await api.delete(`/users/${id}`)
  },
}
