import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NotificationFilter } from '@moby/shared'
import { notificationsApi } from '@/lib/api/notifications.api'
import { triggerToast } from '@/lib/toast-registry'

function invalidateNotifications(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false })
}

export function useNotifications(
  params?: { page?: number; perPage?: number; filter?: NotificationFilter },
  enabled = true,
) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.findAll(params),
    enabled,
  })
}

export function useNotificationsSummary(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: () => notificationsApi.getSummary(),
    enabled,
    staleTime: 30000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      invalidateNotifications(qc)
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: (result) => {
      invalidateNotifications(qc)

      if (result.updatedCount > 0) {
        triggerToast({
          title: '✓ Sucesso',
          description: 'Notificações marcadas como lidas',
          variant: 'success',
        })
      }
    },
  })
}
