// Hooks de unidades: listagem e mutações
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitsApi, type CreateUnitDto, type UpdateUnitDto } from '@/lib/api/units.api'
import { triggerToast } from '@/lib/toast-registry'

export function useUnits(params?: { page?: number; perPage?: number; search?: string; companyId?: string }) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: () => unitsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useCreateUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUnitDto) => unitsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Unidade cadastrada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['units'], exact: false })
    },
  })
}

export function useUpdateUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateUnitDto & { id: string }) => unitsApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Unidade atualizada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['units'], exact: false })
    },
  })
}

export function useRemoveUnit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unitsApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Unidade removida com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['units'], exact: false })
    },
  })
}
