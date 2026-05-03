// Funções de acesso à API de empresas
import { api } from '@/lib/api'

export interface Company {
  id: string
  tenantId: string
  name: string
  tradeName: string | null
  cnpj: string
  cnae: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZipCode: string | null
  isActive: boolean
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; perPage: number; totalPages: number }
}

export interface CreateCompanyDto {
  tenantId?: string
  name: string
  tradeName?: string
  cnpj: string
  cnae?: string
  addressStreet?: string
  addressNumber?: string
  addressComplement?: string
  addressNeighborhood?: string
  addressCity?: string
  addressState?: string
  addressZipCode?: string
  email?: string
  phone?: string
  responsibleName?: string
  responsibleCpf?: string
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
  isActive?: boolean
}

export const companiesApi = {
  findAll: async (params?: { page?: number; perPage?: number; search?: string; tenantId?: string }) => {
    const { data } = await api.get('/companies', { params })
    return data as PaginatedResponse<Company>
  },

  create: async (dto: CreateCompanyDto) => {
    const { data } = await api.post('/companies', dto)
    return data.data as Company
  },

  update: async (id: string, dto: UpdateCompanyDto) => {
    const { data } = await api.patch(`/companies/${id}`, dto)
    return data.data as Company
  },

  remove: async (id: string) => {
    await api.delete(`/companies/${id}`)
  },
}
