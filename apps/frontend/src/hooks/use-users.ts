import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { triggerToast } from '@/lib/toast-registry'
import { usersApi, type CreateUserDto, type UpdateUserDto } from '@/lib/api/users.api'

export function useUsers(params?: { page?: number; perPage?: number; search?: string; tenantId?: string }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.findAll(params),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUserDto) => usersApi.create(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Usuário cadastrado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['users'], exact: false })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateUserDto & { id: string }) => usersApi.update(id, dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Usuário atualizado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['users'], exact: false })
    },
  })
}
