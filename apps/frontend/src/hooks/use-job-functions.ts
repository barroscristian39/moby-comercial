// Hooks de funções/cargos: listagem e mutações
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobFunctionsApi, type CreateJobFunctionDto, type UpdateJobFunctionDto } from '@/lib/api/job-functions.api'
import { triggerToast } from '@/lib/toast-registry'

export function useJobFunctions(params?: {
  page?: number
  perPage?: number
  unitId?: string
  sectorId?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['job-functions', params],
    queryFn: () => jobFunctionsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useJobFunction(id: string | undefined) {
  return useQuery({
    queryKey: ['job-functions', id],
    queryFn: () => jobFunctionsApi.findOne(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useCreateJobFunction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateJobFunctionDto) => jobFunctionsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Função cadastrada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['job-functions'], exact: false })
      qc.invalidateQueries({ queryKey: ['employees'], exact: false })
    },
  })
}

export function useUpdateJobFunction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateJobFunctionDto & { id: string }) => jobFunctionsApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Função atualizada com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['job-functions'], exact: false })
      qc.invalidateQueries({ queryKey: ['employees'], exact: false })
    },
  })
}

export function useRemoveJobFunction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jobFunctionsApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Função removida com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['job-functions'], exact: false })
    },
  })
}
