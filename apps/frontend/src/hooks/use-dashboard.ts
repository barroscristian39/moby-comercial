import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard.api'

export function useDashboardMetrics(
  params?: { companyId?: string; unitId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['dashboard', 'metrics', params],
    queryFn: () => dashboardApi.getMetrics(params),
    enabled,
    staleTime: 30000,
  })
}
