// Hooks de setores: listagem e mutações
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sectorsApi, type CreateSectorDto, type UpdateSectorDto } from '@/lib/api/sectors.api'
import { triggerToast } from '@/lib/toast-registry'

export function useSectors(params?: { page?: number; perPage?: number; unitId?: string; search?: string }) {
  return useQuery({
    queryKey: ['sectors', params],
    queryFn: () => sectorsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useCreateSector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateSectorDto) => sectorsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Setor cadastrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['sectors'], exact: false })
    },
  })
}

export function useUpdateSector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateSectorDto & { id: string }) => sectorsApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Setor atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['sectors'], exact: false })
    },
  })
}

export function useRemoveSector() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sectorsApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Setor removido com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['sectors'], exact: false })
    },
  })
}
