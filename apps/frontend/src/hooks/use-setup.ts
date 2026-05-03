import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { triggerToast } from '@/lib/toast-registry'
import { setupApi, type BootstrapSetupDto } from '@/lib/api/setup.api'

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup-status'],
    queryFn: () => setupApi.getStatus(),
    retry: false,
    staleTime: 30000,
  })
}

export function useBootstrapSetup() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (dto: BootstrapSetupDto) => setupApi.bootstrap(dto),
    onSuccess: () => {
      triggerToast({
        title: '✓ Sucesso',
        description: 'Primeiro acesso configurado com sucesso',
        variant: 'success',
      })
      qc.invalidateQueries({ queryKey: ['setup-status'], exact: false })
    },
  })
}
