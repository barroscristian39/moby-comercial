import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { triggerToast } from '@/lib/toast-registry'
import { tenantsApi, type CreateTenantDto } from '@/lib/api/tenants.api'

export function useTenants(params?: { page?: number; perPage?: number; search?: string }, enabled = true) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () => tenantsApi.findAll(params),
    enabled,
  })
}

export function useCreateTenant() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateTenantDto) => tenantsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Ambiente cadastrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['tenants'], exact: false })
    },
  })
}
