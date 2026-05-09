import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { triggerToast } from '@/lib/toast-registry'
import {
  epiDeliveriesApi,
  type CreateEpiDeliveryDto,
  type UpdateEpiDeliveryDto,
} from '@/lib/api/epi-deliveries.api'

export function useEpiDeliveries(
  params?: {
    page?: number
    perPage?: number
    companyId?: string
    employeeId?: string
    epiItemId?: string
  },
  enabled = true,
) {
  return useQuery({
    queryKey: ['epi-deliveries', params],
    queryFn: () => epiDeliveriesApi.findAll(params),
    enabled,
    staleTime: 1000 * 30,
  })
}

export function useEmployeeEpiCard(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: ['epi-deliveries', 'employee', employeeId],
    queryFn: () => epiDeliveriesApi.findEmployeeCard(employeeId!),
    enabled: !!employeeId,
    staleTime: 1000 * 30,
  })
}

export function useCreateEpiDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateEpiDeliveryDto) => epiDeliveriesApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Entrega de EPI registrada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['epi-deliveries'], exact: false })
      qc.invalidateQueries({ queryKey: ['epi-items'], exact: false })
    },
  })
}

export function useUpdateEpiDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateEpiDeliveryDto & { id: string }) =>
      epiDeliveriesApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Entrega atualizada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['epi-deliveries'], exact: false })
    },
  })
}

export function useRemoveEpiDelivery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => epiDeliveriesApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Entrega removida',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['epi-deliveries'], exact: false })
      qc.invalidateQueries({ queryKey: ['epi-items'], exact: false })
    },
  })
}
