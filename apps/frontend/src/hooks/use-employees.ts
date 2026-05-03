// Hooks de colaboradores: listagem e mutações
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesApi, type CreateEmployeeDto, type UpdateEmployeeDto } from '@/lib/api/employees.api'
import { triggerToast } from '@/lib/toast-registry'

export function useEmployees(params?: {
  page?: number
  perPage?: number
  companyId?: string
  unitId?: string
  sectorId?: string
  jobFunctionId?: string
  search?: string
  isActive?: boolean
}) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () => employeesApi.findAll(params),
    staleTime: 1000 * 30,
  })
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.findOne(id!),
    enabled: !!id,
    staleTime: 1000 * 30,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => employeesApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Colaborador cadastrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['employees'], exact: false })
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateEmployeeDto & { id: string }) => employeesApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Colaborador atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['employees'], exact: false })
    },
  })
}

export function useRemoveEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Colaborador removido com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['employees'], exact: false })
    },
  })
}
