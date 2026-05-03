import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccidentSeverity, AccidentStatus, AccidentType } from '@moby/shared'
import { triggerToast } from '@/lib/toast-registry'
import {
  accidentsApi,
  type CreateAccidentDto,
  type UpdateAccidentDto,
} from '@/lib/api/accidents.api'

export function useAccidents(params?: {
  page?: number
  perPage?: number
  tenantId?: string
  companyId?: string
  unitId?: string
  employeeId?: string
  search?: string
  status?: AccidentStatus
  severity?: AccidentSeverity
  accidentType?: AccidentType
  fromDate?: string
  toDate?: string
}) {
  return useQuery({
    queryKey: ['accidents', params],
    queryFn: () => accidentsApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useAccident(id: string | undefined) {
  return useQuery({
    queryKey: ['accident', id],
    queryFn: () => accidentsApi.findOne(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useAccidentConclusionReport(id: string | undefined) {
  return useQuery({
    queryKey: ['accidents', 'conclusion-report', id],
    queryFn: () => accidentsApi.findConclusionReport(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useCreateAccident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateAccidentDto) => accidentsApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Acidente registrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accidents'], exact: false })
    },
  })
}

export function useUpdateAccident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateAccidentDto & { id: string }) => accidentsApi.update(id, dto),
    onSuccess: (_, variables) => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Acidente atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accidents'], exact: false })
      qc.invalidateQueries({ queryKey: ['accident', variables.id] })
      qc.invalidateQueries({ queryKey: ['accidents', 'conclusion-report', variables.id] })
    },
  })
}

export function useRemoveAccident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accidentsApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Acidente removido com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['accidents'], exact: false })
    },
  })
}
