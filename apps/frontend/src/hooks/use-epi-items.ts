// Hooks de itens de EPI (catálogo): listagem e mutações
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { epiItemsApi, type CreateEpiItemDto, type UpdateEpiItemDto } from '@/lib/api/epi-items.api'
import { triggerToast } from '@/lib/toast-registry'

export function useEpiItems(params?: { page?: number; perPage?: number; search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['epi-items', params],
    queryFn: () => epiItemsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useCreateEpiItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateEpiItemDto) => epiItemsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Item de EPI cadastrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['epi-items'], exact: false })
    },
  })
}

export function useUpdateEpiItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateEpiItemDto & { id: string }) => epiItemsApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Item de EPI atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['epi-items'], exact: false })
    },
  })
}

export function useRemoveEpiItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => epiItemsApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Item de EPI removido com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['epi-items'], exact: false })
    },
  })
}
