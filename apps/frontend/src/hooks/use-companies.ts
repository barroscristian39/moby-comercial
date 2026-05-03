// Hooks de empresas: listagem e mutações (criar, atualizar, remover)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companiesApi, type CreateCompanyDto, type UpdateCompanyDto } from '@/lib/api/companies.api'
import { triggerToast } from '@/lib/toast-registry'

export function useCompanies(
  params?: { page?: number; perPage?: number; search?: string; tenantId?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => companiesApi.findAll(params),
    enabled,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateCompanyDto) => companiesApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Empresa cadastrada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['companies'], exact: false })
    },
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateCompanyDto & { id: string }) => companiesApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Empresa atualizada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['companies'], exact: false })
    },
  })
}

export function useRemoveCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => companiesApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Empresa removida com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['companies'], exact: false })
    },
  })
}
