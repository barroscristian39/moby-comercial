import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { triggerToast } from '@/lib/toast-registry'
import { risksApi, type CreateRiskDto, type UpdateRiskDto } from '@/lib/api/risks.api'

export function useRisks(
  params?: {
    page?: number
    perPage?: number
    tenantId?: string
    companyId?: string
    unitId?: string
    search?: string
    isActive?: boolean
    type?: any
    level?: any
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ['risks', params],
    queryFn: () => risksApi.findAll(params),
    enabled,
    staleTime: 1000 * 30,
  })
}

export function useCreateRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateRiskDto) => risksApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Risco cadastrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['risks'], exact: false })
    },
  })
}

export function useUpdateRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateRiskDto & { id: string }) => risksApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Risco atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['risks'], exact: false })
    },
  })
}

export function useRemoveRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => risksApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Risco removido com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['risks'], exact: false })
    },
  })
}
