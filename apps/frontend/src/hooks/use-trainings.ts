import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { trainingsApi, type CreateTrainingDto, type UpdateTrainingDto } from '@/lib/api/trainings.api'
import { triggerToast } from '@/lib/toast-registry'

export function useTrainings(params?: {
  page?: number
  perPage?: number
  employeeId?: string
  search?: string
  isActive?: boolean
  status?: 'expired' | 'expiring' | 'valid'
}) {
  return useQuery({
    queryKey: ['trainings', params],
    queryFn: () => trainingsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useCreateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTrainingDto) => trainingsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Treinamento registrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['trainings'], exact: false })
    },
  })
}

export function useUpdateTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateTrainingDto & { id: string }) => trainingsApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Treinamento atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['trainings'], exact: false })
    },
  })
}

export function useRemoveTraining() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => trainingsApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Treinamento removido com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['trainings'], exact: false })
    },
  })
}
