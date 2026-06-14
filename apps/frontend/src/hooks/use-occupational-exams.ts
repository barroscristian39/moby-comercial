import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  occupationalExamsApi,
  type CreateOccupationalExamDto,
  type UpdateOccupationalExamDto,
} from '@/lib/api/occupational-exams.api'
import { triggerToast } from '@/lib/toast-registry'

export function useOccupationalExams(params?: {
  page?: number
  perPage?: number
  employeeId?: string
  search?: string
  isActive?: boolean
  status?: 'expired' | 'expiring' | 'valid'
}) {
  return useQuery({
    queryKey: ['occupational-exams', params],
    queryFn: () => occupationalExamsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useCreateOccupationalExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateOccupationalExamDto) => occupationalExamsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Exame ocupacional registrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['occupational-exams'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'], exact: false })
    },
  })
}

export function useUpdateOccupationalExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateOccupationalExamDto & { id: string }) => occupationalExamsApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Exame ocupacional atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['occupational-exams'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'], exact: false })
    },
  })
}

export function useRemoveOccupationalExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => occupationalExamsApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Exame ocupacional removido com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['occupational-exams'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard-metrics'], exact: false })
    },
  })
}
