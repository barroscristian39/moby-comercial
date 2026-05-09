import { api } from '@/lib/api'
import type { PaginatedResponse } from './companies.api'

export type EpiDeliveryReason = 'ADMISSION' | 'PERIODIC' | 'REPLACEMENT' | 'FUNCTION_CHANGE' | 'CA_RENEWAL' | 'OTHER'
export type EpiDeliveryCondition = 'NEW' | 'USED'

export interface EpiDelivery {
  id: string
  companyId: string
  employeeId: string
  employeeName: string
  epiItemId: string
  epiItemName: string
  caNumberSnapshot: string
  quantity: number
  deliveredAt: string
  reason: EpiDeliveryReason
  condition: EpiDeliveryCondition
  deliveredBy: string | null
  returnedAt: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateEpiDeliveryDto {
  companyId: string
  employeeId: string
  epiItemId: string
  quantity: number
  deliveredAt: string
  reason: EpiDeliveryReason
  condition: EpiDeliveryCondition
  deliveredBy?: string
  notes?: string
}

export interface UpdateEpiDeliveryDto {
  notes?: string
  returnedAt?: string
}

export const epiDeliveriesApi = {
  findAll: async (params?: {
    page?: number
    perPage?: number
    companyId?: string
    employeeId?: string
    epiItemId?: string
  }) => {
    const { data } = await api.get('/epi-deliveries', { params })
    return data as PaginatedResponse<EpiDelivery>
  },

  findEmployeeCard: async (employeeId: string) => {
    const { data } = await api.get(`/epi-deliveries/employee/${employeeId}`)
    return data.data as EpiDelivery[]
  },

  findOne: async (id: string) => {
    const { data } = await api.get(`/epi-deliveries/${id}`)
    return data.data as EpiDelivery
  },

  create: async (dto: CreateEpiDeliveryDto) => {
    const { data } = await api.post('/epi-deliveries', dto)
    return data.data as EpiDelivery
  },

  update: async (id: string, dto: UpdateEpiDeliveryDto) => {
    const { data } = await api.patch(`/epi-deliveries/${id}`, dto)
    return data.data as EpiDelivery
  },

  remove: async (id: string) => {
    await api.delete(`/epi-deliveries/${id}`)
  },
}
