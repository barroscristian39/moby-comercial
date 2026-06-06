import { api } from '@/lib/api'

export interface DashboardMetrics {
  companyId: string | null
  unitId: string | null
  activeUnits: number
  employees: number
  reportsIssued: number
  supplementaryExams: number | null
  supplementaryExamsAvailable: boolean
  accidentsWithLeave: number
  accidentsWithoutLeave: number
  expiredEpis: number
  criticalRisks: number
}

export const dashboardApi = {
  getMetrics: async (params?: { companyId?: string; unitId?: string }) => {
    const { data } = await api.get('/dashboard/metrics', { params })
    return data.data as DashboardMetrics
  },
}
