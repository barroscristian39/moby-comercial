// Funções de acesso à API de colaboradores
import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export interface Employee {
  id: string
  companyId: string
  unitId: string
  sectorId: string | null
  jobFunctionId: string
  name: string
  cpf: string
  email: string | null
  phone: string | null
  birthDate: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  registration: string | null
  admissionDate: string
  dismissalDate: string | null
  isActive: boolean
  createdAt: string
}

export interface CreateEmployeeDto {
  companyId: string
  unitId: string
  sectorId?: string
  jobFunctionId: string
  name: string
  cpf: string
  email?: string
  phone?: string
  birthDate?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  registration?: string
  admissionDate: string
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  isActive?: boolean
}

export const employeesApi = {
  findAll: async (params?: {
    page?: number
    perPage?: number
    companyId?: string
    unitId?: string
    sectorId?: string
    jobFunctionId?: string
    search?: string
    isActive?: boolean
  }) => {
    const { data } = await api.get('/employees', { params })
    return data as PaginatedResponse<Employee>
  },

  findOne: async (id: string) => {
    const { data } = await api.get(`/employees/${id}`)
    return data.data as Employee
  },

  create: async (dto: CreateEmployeeDto) => {
    const { data } = await api.post('/employees', dto)
    return data.data as Employee
  },

  update: async (id: string, dto: UpdateEmployeeDto) => {
    const { data } = await api.patch(`/employees/${id}`, dto)
    return data.data as Employee
  },

  remove: async (id: string) => {
    await api.delete(`/employees/${id}`)
  },
}
